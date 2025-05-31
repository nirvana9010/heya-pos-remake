#!/bin/bash

# Heya POS Development Environment Shutdown Script

set -e

echo "🛑 Stopping Heya POS Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Read PIDs from file if it exists
if [ -f ".pids" ]; then
    source .pids
    
    echo -e "${YELLOW}Stopping services using PID file...${NC}"
    
    # Kill processes
    [ ! -z "$API_PID" ] && kill $API_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped API${NC}" || true
    [ ! -z "$MERCHANT_PID" ] && kill $MERCHANT_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped Merchant App${NC}" || true
    [ ! -z "$BOOKING_PID" ] && kill $BOOKING_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped Booking App${NC}" || true
    [ ! -z "$ADMIN_PID" ] && kill $ADMIN_PID 2>/dev/null && echo -e "${GREEN}✅ Stopped Admin Dashboard${NC}" || true
    
    rm .pids
else
    echo -e "${YELLOW}No PID file found, searching for processes...${NC}"
fi

# Fallback: Kill by port
echo -e "\n${YELLOW}Ensuring all ports are free...${NC}"

# Kill anything on our standard ports
for port in 3000 3001 3002 3003; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Killing process on port $port...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
    fi
done

# Kill any nest or next processes
echo -e "\n${YELLOW}Cleaning up any remaining processes...${NC}"
pkill -f "nest start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

echo -e "\n${GREEN}✅ All services stopped successfully!${NC}"