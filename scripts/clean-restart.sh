#!/bin/bash

# Clean Restart Script for Heya POS
# This script performs a complete clean restart of all services

echo "================================================"
echo "🧹 Heya POS Clean Restart Script"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="/home/nirvana9010/projects/heya-pos-remake/heya-pos"
cd $PROJECT_ROOT

echo -e "${YELLOW}Step 1: Stopping all PM2 processes...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
echo -e "${GREEN}✓ PM2 processes stopped${NC}"

echo ""
echo -e "${YELLOW}Step 2: Killing all Node.js processes...${NC}"
# Kill Next.js processes (including zombie next-server processes)
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "nest" 2>/dev/null || true
# Kill any npm run processes that might be stuck
pkill -9 -f "npm run dev" 2>/dev/null || true
# Kill processes by port
pkill -9 -f "node.*3000" 2>/dev/null || true
pkill -9 -f "node.*3001" 2>/dev/null || true
pkill -9 -f "node.*3002" 2>/dev/null || true
pkill -9 -f "node.*3003" 2>/dev/null || true
# Use fuser as backup to kill by port
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
fuser -k 3002/tcp 2>/dev/null || true
fuser -k 3003/tcp 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ Node.js processes killed${NC}"

echo ""
echo -e "${YELLOW}Step 3: Clearing ports explicitly...${NC}"
for port in 3000 3001 3002 3003; do
    # Try multiple methods to clear the port
    port_in_use=false
    
    # Check with lsof
    if lsof -i :$port > /dev/null 2>&1; then
        port_in_use=true
    fi
    
    # Also check with fuser
    if fuser $port/tcp > /dev/null 2>&1; then
        port_in_use=true
    fi
    
    if [ "$port_in_use" = true ]; then
        # Method 1: Using lsof
        lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
        
        # Method 2: Using fuser
        fuser -k $port/tcp 2>/dev/null || true
        
        sleep 1
        
        # Method 3: Double check and force kill any remaining
        if lsof -i :$port > /dev/null 2>&1; then
            for pid in $(lsof -ti:$port); do
                kill -9 $pid 2>/dev/null || true
            done
        fi
        
        # Final check with fuser
        remaining_pids=$(fuser $port/tcp 2>/dev/null | tr -d ' ')
        if [ ! -z "$remaining_pids" ]; then
            for pid in $remaining_pids; do
                kill -9 $pid 2>/dev/null || true
            done
        fi
        
        echo -e "${GREEN}✓ Port $port cleared${NC}"
    else
        echo -e "  Port $port already free"
    fi
done

# Extra wait to ensure ports are released
sleep 2

echo ""
echo -e "${YELLOW}Step 4: Clearing PM2 logs (optional)...${NC}"
pm2 flush 2>/dev/null || true
echo -e "${GREEN}✓ PM2 logs flushed${NC}"

echo ""
echo -e "${YELLOW}Step 5: Starting services...${NC}"

# Start API with PM2
echo -e "  Starting API service..."
cd $PROJECT_ROOT
pm2 start ecosystem.config.js --only api
echo -e "${GREEN}✓ API started with PM2${NC}"

# Wait for API to be ready
echo -e "  Waiting for API to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/v1/services > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ API failed to start after 30 seconds${NC}"
        echo "  Check logs with: pm2 logs api"
        exit 1
    fi
    sleep 1
done

# Start Merchant App
echo -e "  Starting Merchant App..."
cd $PROJECT_ROOT/apps/merchant-app
nohup npm run dev:direct > $PROJECT_ROOT/logs/merchant-direct.log 2>&1 &
MERCHANT_PID=$!
echo -e "${GREEN}✓ Merchant App started (PID: $MERCHANT_PID)${NC}"

# Start Booking App (optional - uncomment if needed)
echo -e "  Starting Booking App..."
cd $PROJECT_ROOT/apps/booking-app
nohup npm run dev > $PROJECT_ROOT/logs/booking-app.log 2>&1 &
BOOKING_PID=$!
echo -e "${GREEN}✓ Booking App started (PID: $BOOKING_PID)${NC}"

# Wait a moment for apps to start
sleep 5

echo ""
echo "================================================"
echo -e "${GREEN}✅ Clean Restart Complete!${NC}"
echo "================================================"
echo ""
echo "Service Status:"
echo "---------------"

# Check PM2 status
pm2 status

echo ""
echo "Port Status:"
echo "------------"
for port in 3000 3001 3002; do
    if lsof -i :$port > /dev/null 2>&1; then
        echo -e "Port $port: ${GREEN}LISTENING${NC}"
    else
        echo -e "Port $port: ${RED}NOT LISTENING${NC}"
    fi
done

echo ""
echo "Logs:"
echo "-----"
echo "API logs:      pm2 logs api --nostream --lines 20"
echo "Merchant logs: tail -f $PROJECT_ROOT/logs/merchant-direct.log"
echo "Booking logs:  tail -f $PROJECT_ROOT/logs/booking-app.log"
echo ""
echo "Access URLs:"
echo "------------"
echo "API:           http://localhost:3000"
echo "Merchant App:  http://localhost:3002"
echo "Booking App:   http://localhost:3001"
echo ""