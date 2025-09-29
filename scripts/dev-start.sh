#!/bin/bash

# Heya POS Development Environment Startup Script
# This script ensures clean startup of all services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

CLEAN_CACHES=false
FRESH_START=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --clean)
            CLEAN_CACHES=true
            shift
            ;;
        --fresh)
            FRESH_START=true
            CLEAN_CACHES=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./scripts/dev-start.sh [--clean] [--fresh]"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PYTHON_AVAILABLE=true
if ! command -v python3 >/dev/null 2>&1; then
    PYTHON_AVAILABLE=false
fi

DEV_BUILD_SIGNATURE="dev-$(date -u +%Y%m%d-%H%M%S)"
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
DEV_BUILD_SIGNATURE="${DEV_BUILD_SIGNATURE}-${GIT_SHA}"
export NEXT_PUBLIC_DEV_BUILD_SIGNATURE="$DEV_BUILD_SIGNATURE"

echo "🚀 Starting Heya POS Development Environment..."
echo "   Dev build signature: $NEXT_PUBLIC_DEV_BUILD_SIGNATURE"

if [ "$FRESH_START" = true ]; then
    echo -e "${YELLOW}Prepping fresh start: stopping existing services and cleaning caches...${NC}"
    "$SCRIPT_DIR/dev-stop.sh" --clean || true
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}❌ Port $1 is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $1 is available${NC}"
        return 0
    fi
}

# Function to kill process on port
kill_port() {
    echo -e "${YELLOW}Killing process on port $1...${NC}"
    lsof -ti:$1 | xargs kill -9 2>/dev/null || true
}

# Function to clean build caches
clean_caches() {
    echo -e "${YELLOW}Cleaning build caches...${NC}"
    rm -rf apps/merchant-app/.next
    rm -rf apps/booking-app/.next
    rm -rf apps/admin-dashboard/.next
    rm -rf apps/api/dist
    rm -rf node_modules/.cache
    echo -e "${GREEN}✅ Caches cleaned${NC}"
}

auto_clean_if_stale() {
    local label="$1"
    local src_dir="$2"
    local cache_dir="$3"

    if [ ! -d "$src_dir" ]; then
        return
    fi

    if [ ! -d "$cache_dir" ]; then
        echo -e "${YELLOW}${label} cache missing — will rebuild automatically${NC}"
        return
    fi

    if [ "$PYTHON_AVAILABLE" != true ]; then
        echo -e "${YELLOW}Skipping ${label} cache freshness check (python3 not available)${NC}"
        return
    fi

    local latest_src
    latest_src=$(python3 - <<'PY' "$src_dir"
import os, sys
root = sys.argv[1]
latest = 0
for dirpath, dirnames, filenames in os.walk(root):
    if 'node_modules' in dirpath.split(os.sep):
        continue
    for name in filenames:
        path = os.path.join(dirpath, name)
        try:
            mtime = int(os.path.getmtime(path))
        except OSError:
            continue
        if mtime > latest:
            latest = mtime
print(latest)
PY
    )
    if [ -z "$latest_src" ]; then
        latest_src=0
    fi

    local cache_mtime
    cache_mtime=$(python3 - <<'PY' "$cache_dir"
import os, sys
target = sys.argv[1]
try:
    print(int(os.path.getmtime(target)))
except OSError:
    print(0)
PY
    )

    if [ "$latest_src" -gt "$cache_mtime" ]; then
        echo -e "${YELLOW}${label} source newer than cached build — clearing ${cache_dir}${NC}"
        rm -rf "$cache_dir"
        echo -e "${GREEN}✅ ${label} cache cleared${NC}"
    else
        echo -e "${GREEN}✅ ${label} cache is up to date${NC}"
    fi
}

# Step 0: Prep caches
echo -e "\n${YELLOW}Step 0: Preparing workspace caches...${NC}"
if [ "$CLEAN_CACHES" = true ]; then
    clean_caches
else
    if [ "$PYTHON_AVAILABLE" != true ]; then
        echo -e "${YELLOW}python3 not found; run with --clean or --fresh to purge caches manually${NC}"
    fi
    auto_clean_if_stale "Merchant app" "apps/merchant-app/src" "apps/merchant-app/.next"
    auto_clean_if_stale "Booking app" "apps/booking-app/src" "apps/booking-app/.next"
    auto_clean_if_stale "Admin dashboard" "apps/admin-dashboard/src" "apps/admin-dashboard/.next"
fi

# Define ports
API_PORT=3000
BOOKING_PORT=3001
MERCHANT_PORT=3002
ADMIN_PORT=3003

# Step 1: Kill any existing processes
echo -e "\n${YELLOW}Step 1: Checking ports...${NC}"
for port in $API_PORT $BOOKING_PORT $MERCHANT_PORT $ADMIN_PORT; do
    if ! check_port $port; then
        kill_port $port
    fi
done

# Step 2: Ensure database exists
echo -e "\n${YELLOW}Step 2: Checking database...${NC}"
if "$SCRIPT_DIR/ensure-db.sh"; then
    echo -e "${GREEN}✅ Database ready${NC}"
else
    echo -e "${RED}❌ Cannot connect to database${NC}"
    exit 1
fi

# Step 3: Start API
echo -e "\n${YELLOW}Step 3: Starting API on port $API_PORT...${NC}"
mkdir -p logs
cd apps/api
./dev-service.sh start
cd ../..

API_PID=""
if [ -f logs/api-dev.pid ]; then
    API_PID=$(cat logs/api-dev.pid)
fi

# Wait for API to be ready
echo "Waiting for API to start..."
for i in {1..40}; do
    health_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$API_PORT/api/v1/health || true)
    if [ "$health_status" = "200" ]; then
        echo -e "${GREEN}✅ API is running on port $API_PORT${NC}"
        break
    fi
    if [ $i -eq 40 ]; then
        echo -e "${RED}❌ API failed to start. Check logs/api.log${NC}"
        exit 1
    fi
    sleep 1
done

# Step 4: Start Merchant App (with zombie cleanup)
echo -e "\n${YELLOW}Step 4: Starting Merchant App on port $MERCHANT_PORT with zombie cleanup...${NC}"
cd apps/merchant-app
./dev-service.sh start
cd ../..

# Step 5: Start Booking App
echo -e "\n${YELLOW}Step 5: Starting Booking App on port $BOOKING_PORT...${NC}"
cd apps/booking-app
NEXT_PUBLIC_DEV_BUILD_SIGNATURE="$DEV_BUILD_SIGNATURE" NEXT_PUBLIC_API_URL=http://localhost:$API_PORT/api npm run dev > ../../logs/booking.log 2>&1 &
BOOKING_PID=$!
cd ../..

# Step 6: Start Admin Dashboard
echo -e "\n${YELLOW}Step 6: Starting Admin Dashboard on port $ADMIN_PORT...${NC}"
cd apps/admin-dashboard
NEXT_PUBLIC_DEV_BUILD_SIGNATURE="$DEV_BUILD_SIGNATURE" NEXT_PUBLIC_API_URL=http://localhost:$API_PORT/api npm run dev > ../../logs/admin.log 2>&1 &
ADMIN_PID=$!
cd ../..

# Create PID file for easy shutdown (merchant managed by its own service)
echo "API_PID=$API_PID" > .pids
echo "BOOKING_PID=$BOOKING_PID" >> .pids
echo "ADMIN_PID=$ADMIN_PID" >> .pids

echo -e "\n${GREEN}🎉 All services started successfully!${NC}"
echo -e "\nServices running at:"
echo -e "  API:              http://localhost:$API_PORT/api"
echo -e "  Merchant App:     http://localhost:$MERCHANT_PORT"
echo -e "  Booking App:      http://localhost:$BOOKING_PORT"
echo -e "  Admin Dashboard:  http://localhost:$ADMIN_PORT"
echo -e "\nLogs available in:"
echo -e "  API:              logs/api.log"
echo -e "  Merchant App:     logs/merchant.log"
echo -e "  Booking App:      logs/booking.log"
echo -e "  Admin Dashboard:  logs/admin.log"
echo -e "\nTo stop all services, run: ./scripts/dev-stop.sh"
