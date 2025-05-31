#!/bin/bash

# Heya POS Development Environment Status Check

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Heya POS Development Status ===${NC}\n"

# Function to check service
check_service() {
    local name=$1
    local url=$2
    local port=$3
    
    echo -n "Checking $name... "
    
    # Check if port is listening
    if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}❌ Not running (port $port not in use)${NC}"
        return
    fi
    
    # Check if service responds
    if curl -s -f -m 2 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Running on port $port${NC}"
        
        # Special checks for API
        if [ "$name" == "API" ]; then
            # Check database connection
            if curl -s http://localhost:$port/api/health | grep -q "ok"; then
                echo -e "  └─ Database: ${GREEN}Connected${NC}"
            else
                echo -e "  └─ Database: ${RED}Not connected${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Port in use but not responding${NC}"
    fi
}

# Check each service
check_service "API" "http://localhost:3000/api" 3000
check_service "Merchant App" "http://localhost:3002" 3002
check_service "Booking App" "http://localhost:3001" 3001
check_service "Admin Dashboard" "http://localhost:3003" 3003

# Check for zombie processes
echo -e "\n${BLUE}Process Check:${NC}"
NEST_COUNT=$(pgrep -f "nest start" | wc -l)
NEXT_COUNT=$(pgrep -f "next dev" | wc -l)

if [ $NEST_COUNT -gt 1 ]; then
    echo -e "${YELLOW}⚠️  Multiple NestJS processes detected ($NEST_COUNT)${NC}"
else
    echo -e "${GREEN}✅ NestJS processes: $NEST_COUNT${NC}"
fi

if [ $NEXT_COUNT -gt 3 ]; then
    echo -e "${YELLOW}⚠️  Too many Next.js processes detected ($NEXT_COUNT)${NC}"
else
    echo -e "${GREEN}✅ Next.js processes: $NEXT_COUNT${NC}"
fi

# Check logs for recent errors
echo -e "\n${BLUE}Recent Errors:${NC}"
if [ -d "logs" ]; then
    for log in logs/*.log; do
        if [ -f "$log" ]; then
            ERROR_COUNT=$(tail -100 "$log" 2>/dev/null | grep -i "error" | wc -l)
            if [ $ERROR_COUNT -gt 0 ]; then
                echo -e "${YELLOW}⚠️  $(basename $log): $ERROR_COUNT errors in last 100 lines${NC}"
            fi
        fi
    done
else
    echo -e "${YELLOW}No logs directory found${NC}"
fi

# Memory usage
echo -e "\n${BLUE}Memory Usage:${NC}"
ps aux | grep -E "(node|nest|next)" | grep -v grep | awk '{sum+=$6} END {printf "Total Node.js memory: %.1f MB\n", sum/1024}'