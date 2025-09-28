#!/bin/bash

# Heya POS Development Environment Startup Script
# This script ensures clean startup of all services

set -e

echo "🚀 Starting Heya POS Development Environment..."

# Define ports
API_PORT=3000
BOOKING_PORT=3001
MERCHANT_PORT=3002
ADMIN_PORT=3003

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Step 1: Kill any existing processes
echo -e "\n${YELLOW}Step 1: Checking ports...${NC}"
for port in $API_PORT $BOOKING_PORT $MERCHANT_PORT $ADMIN_PORT; do
    if ! check_port $port; then
        kill_port $port
    fi
done

# Step 2: Clean caches if requested
if [ "$1" == "--clean" ]; then
    echo -e "\n${YELLOW}Step 2: Cleaning caches...${NC}"
    clean_caches
fi

# Step 3: Ensure database exists
echo -e "\n${YELLOW}Step 3: Checking database...${NC}"
if ./scripts/ensure-db.sh; then
    echo -e "${GREEN}✅ Database ready${NC}"
else
    echo -e "${RED}❌ Cannot connect to database${NC}"
    exit 1
fi

# Step 4: Start API
echo -e "\n${YELLOW}Step 4: Starting API on port $API_PORT...${NC}"
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

# Step 5: Start Merchant App (with zombie cleanup)
echo -e "\n${YELLOW}Step 5: Starting Merchant App on port $MERCHANT_PORT with zombie cleanup...${NC}"
cd apps/merchant-app
./dev-service.sh start
cd ../..

# Step 6: Start Booking App
echo -e "\n${YELLOW}Step 6: Starting Booking App on port $BOOKING_PORT...${NC}"
cd apps/booking-app
NEXT_PUBLIC_API_URL=http://localhost:$API_PORT/api npm run dev > ../../logs/booking.log 2>&1 &
BOOKING_PID=$!
cd ../..

# Step 7: Start Admin Dashboard
echo -e "\n${YELLOW}Step 7: Starting Admin Dashboard on port $ADMIN_PORT...${NC}"
cd apps/admin-dashboard
NEXT_PUBLIC_API_URL=http://localhost:$API_PORT/api npm run dev > ../../logs/admin.log 2>&1 &
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
