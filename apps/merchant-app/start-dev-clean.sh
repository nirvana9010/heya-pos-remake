#!/bin/bash

# Improved auto-restart script with zombie process cleanup
PORT=3002
APP_NAME="merchant-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting ${APP_NAME} with auto-restart and process cleanup...${NC}"

# Function to cleanup zombie processes
cleanup_zombies() {
  echo -e "${YELLOW}Cleaning up any existing processes on port ${PORT}...${NC}"
  
  # Kill any process using the port
  if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Found process on port ${PORT}, killing it...${NC}"
    lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
  
  # Kill any lingering Next.js processes
  pkill -f "next-server" 2>/dev/null || true
  pkill -f "next dev.*${PORT}" 2>/dev/null || true
  
  # Give processes time to die
  sleep 2
  
  # Double-check port is free
  if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}WARNING: Port ${PORT} still in use after cleanup!${NC}"
    return 1
  else
    echo -e "${GREEN}Port ${PORT} is now free${NC}"
    return 0
  fi
}

# Function to start the dev server
start_server() {
  echo -e "${GREEN}[$(date)] Starting Next.js dev server on port ${PORT}...${NC}"
  
  # Use exec to replace the shell process, making cleanup easier
  exec npm run dev:direct
}

# Trap signals to ensure cleanup on exit
trap 'echo -e "\n${YELLOW}Shutting down...${NC}"; cleanup_zombies; exit 0' INT TERM

# Main loop
MAX_RETRIES=10
RETRY_COUNT=0

while true; do
  # Always cleanup before starting
  if cleanup_zombies; then
    RETRY_COUNT=0
    
    # Start the server in a subshell so we can monitor it
    (
      start_server
    )
    
    # Get the exit code
    EXIT_CODE=$?
    
    echo -e "${RED}[$(date)] Dev server exited with code ${EXIT_CODE}${NC}"
    
    # If it was a clean exit (Ctrl+C), don't restart
    if [ $EXIT_CODE -eq 0 ] || [ $EXIT_CODE -eq 130 ]; then
      echo -e "${GREEN}Clean exit detected. Stopping auto-restart.${NC}"
      break
    fi
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "${RED}Failed to cleanup port ${PORT} (attempt ${RETRY_COUNT}/${MAX_RETRIES})${NC}"
    
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo -e "${RED}Max retries reached. Please manually check for processes using port ${PORT}${NC}"
      echo -e "${YELLOW}Try running: lsof -i :${PORT}${NC}"
      exit 1
    fi
  fi
  
  # Wait before restarting
  echo -e "${YELLOW}Waiting 5 seconds before restart...${NC}"
  sleep 5
done

echo -e "${GREEN}${APP_NAME} shutdown complete${NC}"