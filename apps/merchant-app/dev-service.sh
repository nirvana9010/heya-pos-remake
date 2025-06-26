#!/bin/bash

# Service-like script for merchant app with proper process management
# This script ensures clean startup and shutdown

PORT=3002
APP_NAME="merchant-app"
PID_FILE="/tmp/${APP_NAME}.pid"
LOG_FILE="../../logs/merchant-direct.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check if service is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
        fi
    fi
    return 1
}

# Function to stop the service
stop_service() {
    echo -e "${YELLOW}🛑 Stopping ${APP_NAME} with cleanup...${NC}"
    
    # First try graceful shutdown
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        kill -TERM "$PID" 2>/dev/null || true
        
        # Wait up to 5 seconds for graceful shutdown
        for i in {1..5}; do
            if ! ps -p "$PID" > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done
        
        # Force kill if still running
        if ps -p "$PID" > /dev/null 2>&1; then
            kill -9 "$PID" 2>/dev/null || true
        fi
        
        rm -f "$PID_FILE"
    fi
    
    # Clean up any zombie processes
    pkill -f "next dev.*${PORT}" 2>/dev/null || true
    pkill -f "next-server" 2>/dev/null || true
    lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true
    
    sleep 2
    echo -e "${GREEN}✅ ${APP_NAME} stopped with zombie cleanup complete${NC}"
}

# Function to start the service
start_service() {
    if is_running; then
        echo -e "${YELLOW}${APP_NAME} is already running (PID: $(cat $PID_FILE))${NC}"
        return 1
    fi
    
    # Make sure port is free
    if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}Port ${PORT} is already in use!${NC}"
        echo -e "${YELLOW}Attempting to clean up...${NC}"
        stop_service
    fi
    
    echo -e "${GREEN}🚀 Starting ${APP_NAME} on port ${PORT} with zombie cleanup...${NC}"
    
    # Start the dev server
    nohup npm run dev:direct > "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    
    # Wait a bit to see if it starts successfully
    sleep 3
    
    if is_running; then
        echo -e "${GREEN}✅ ${APP_NAME} started successfully with zombie cleanup (PID: $PID)${NC}"
        echo -e "${GREEN}Logs: tail -f $LOG_FILE${NC}"
        return 0
    else
        echo -e "${RED}Failed to start ${APP_NAME}${NC}"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to restart the service
restart_service() {
    stop_service
    sleep 2
    start_service
}

# Function to show status
status_service() {
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${GREEN}${APP_NAME} is running (PID: $PID)${NC}"
        
        # Show port info
        echo -e "\n${YELLOW}Port information:${NC}"
        lsof -i :${PORT} 2>/dev/null | grep LISTEN || echo "Port ${PORT} is free"
        
        # Show recent logs
        echo -e "\n${YELLOW}Recent logs:${NC}"
        tail -5 "$LOG_FILE" 2>/dev/null || echo "No logs available"
    else
        echo -e "${RED}${APP_NAME} is not running${NC}"
    fi
}

# Main command handling
case "${1}" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        status_service
        ;;
    logs)
        tail -f "$LOG_FILE"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the ${APP_NAME} service"
        echo "  stop    - Stop the ${APP_NAME} service"
        echo "  restart - Restart the ${APP_NAME} service"
        echo "  status  - Show service status"
        echo "  logs    - Follow the service logs"
        exit 1
        ;;
esac