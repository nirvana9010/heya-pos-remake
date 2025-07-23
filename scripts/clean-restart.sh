#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧹 Heya POS Clean Restart Script${NC}"
echo -e "${YELLOW}================================${NC}"

# Step 1: Stop PM2 processes
echo -e "\n${YELLOW}Step 1: Stopping PM2 processes...${NC}"
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null
echo -e "${GREEN}✓ PM2 processes stopped${NC}"

# Step 2: Kill all Node.js processes (Next.js, Nest.js)
echo -e "\n${YELLOW}Step 2: Killing all Node.js processes...${NC}"
pkill -9 -f "next" 2>/dev/null || true
pkill -9 -f "nest" 2>/dev/null || true
pkill -9 -f "node.*3000" 2>/dev/null || true
pkill -9 -f "node.*3001" 2>/dev/null || true
pkill -9 -f "node.*3002" 2>/dev/null || true
pkill -9 -f "node.*3003" 2>/dev/null || true
echo -e "${GREEN}✓ Node.js processes killed${NC}"

# Step 3: Clear ports explicitly
echo -e "\n${YELLOW}Step 3: Clearing ports...${NC}"
for port in 3000 3001 3002 3003; do
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    echo -e "${GREEN}✓ Port $port cleared${NC}"
done

# Step 4: Clear PM2 logs (optional)
echo -e "\n${YELLOW}Step 4: Clearing PM2 logs...${NC}"
pm2 flush 2>/dev/null || true
echo -e "${GREEN}✓ PM2 logs cleared${NC}"

# Step 5: Wait a moment for everything to clean up
echo -e "\n${YELLOW}Waiting for processes to fully terminate...${NC}"
sleep 3

# Step 6: Start services
echo -e "\n${YELLOW}Step 6: Starting services...${NC}"

# Start API first
echo -e "${YELLOW}Starting API...${NC}"
cd /home/nirvana9010/projects/heya-pos-remake/heya-pos/apps/api
nohup npm run start:dev > api.log 2>&1 &
API_PID=$!
echo -e "${GREEN}✓ API starting with PID: $API_PID${NC}"

# Wait for API to be ready
echo -e "${YELLOW}Waiting for API to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Start merchant app
echo -e "\n${YELLOW}Starting Merchant App...${NC}"
cd /home/nirvana9010/projects/heya-pos-remake/heya-pos/apps/merchant-app
nohup npm run dev:direct > merchant.log 2>&1 &
MERCHANT_PID=$!
echo -e "${GREEN}✓ Merchant app starting with PID: $MERCHANT_PID${NC}"

# Always start ALL apps
echo -e "\n${YELLOW}Starting Booking App...${NC}"
cd /home/nirvana9010/projects/heya-pos-remake/heya-pos/apps/booking-app
nohup npm run dev > booking.log 2>&1 &
BOOKING_PID=$!
echo -e "${GREEN}✓ Booking app starting with PID: $BOOKING_PID${NC}"

# Start admin dashboard
echo -e "\n${YELLOW}Starting Admin Dashboard...${NC}"
cd /home/nirvana9010/projects/heya-pos-remake/heya-pos/apps/admin-dashboard
nohup npm run dev > admin.log 2>&1 &
ADMIN_PID=$!
echo -e "${GREEN}✓ Admin dashboard starting with PID: $ADMIN_PID${NC}"

# Final status check
echo -e "\n${YELLOW}Final Status Check:${NC}"
sleep 3
echo -e "\n${YELLOW}Running processes:${NC}"
ps aux | grep -E "nest|next" | grep -v grep | grep -v "clean-restart"

echo -e "\n${YELLOW}Port status:${NC}"
for port in 3000 3001 3002 3003; do
    if lsof -i:$port > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Port $port: IN USE${NC}"
    else
        echo -e "${RED}✗ Port $port: FREE${NC}"
    fi
done

echo -e "\n${GREEN}🚀 Clean restart complete!${NC}"
echo -e "${YELLOW}Access your apps at:${NC}"
echo -e "  API:              http://localhost:3000"
echo -e "  Merchant App:     http://localhost:3002"
echo -e "  Booking App:      http://localhost:3001"
echo -e "  Admin Dashboard:  http://localhost:3003"

echo -e "\n${YELLOW}Logs available at:${NC}"
echo -e "  API:              apps/api/api.log"
echo -e "  Merchant:         apps/merchant-app/merchant.log"
echo -e "  Booking:          apps/booking-app/booking.log"
echo -e "  Admin Dashboard:  apps/admin-dashboard/admin.log"