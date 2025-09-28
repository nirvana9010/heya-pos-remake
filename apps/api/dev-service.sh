#!/bin/bash

# Service manager for the API dev server. Mirrors the merchant dev-service
# approach so we only ever have a single Nest watcher running and we can
# clean up zombie processes reliably.

APP_NAME="api"
DEFAULT_PORT=3000
DETACH_MODE=${DEV_SERVICE_DETACH:-1}

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/api.log"
PID_FILE="$LOG_DIR/api-dev.pid"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ensure_log_dir() {
    mkdir -p "$LOG_DIR"
}

load_env() {
    local env_file="$SCRIPT_DIR/.env"
    if [ -f "$env_file" ]; then
        # shellcheck disable=SC1090
        set -a; source "$env_file"; set +a
    fi
}

current_port() {
    if [ -n "$DEV_SERVICE_PORT" ]; then
        echo "$DEV_SERVICE_PORT"
    elif [ -n "$PORT" ]; then
        echo "$PORT"
    else
        echo "$DEFAULT_PORT"
    fi
}

is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
        rm -f "$PID_FILE"
    fi
    return 1
}

kill_stragglers() {
    pkill -f "node_modules/.bin/nest start --watch" 2>/dev/null || true
    pkill -f "node dist/main" 2>/dev/null || true
}

stop_service() {
    if is_running; then
        local pid
        pid=$(cat "$PID_FILE")
        echo -e "${YELLOW}🛑 Stopping ${APP_NAME} dev service (PID: ${pid})...${NC}"
        kill "$pid" 2>/dev/null || true

        for _ in {1..10}; do
            if ! ps -p "$pid" > /dev/null 2>&1; then
                break
            fi
            sleep 1
        done

        if ps -p "$pid" > /dev/null 2>&1; then
            kill -9 "$pid" 2>/dev/null || true
        fi

        rm -f "$PID_FILE"
    fi

    kill_stragglers

    local port
    port=$(current_port)
    lsof -ti:"$port" | xargs kill -9 2>/dev/null || true

    echo -e "${GREEN}✅ ${APP_NAME} dev service stopped${NC}"
}

start_service() {
    local port
    port=$(current_port)

    if is_running; then
        echo -e "${YELLOW}${APP_NAME} is already running -- restarting...${NC}"
        stop_service
    fi

    echo -e "${YELLOW}🔄 Cleaning up stray ${APP_NAME} processes...${NC}"
    kill_stragglers

    if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Port ${port} is busy. Forcing release...${NC}"
        lsof -ti:"$port" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    ensure_log_dir
    load_env

    echo -e "${GREEN}🚀 Starting ${APP_NAME} on port ${port}...${NC}"

    if [ "$DETACH_MODE" = "1" ]; then
        NODE_ENV=development PORT="$port" npm run start:dev >> "$LOG_FILE" 2>&1 &
        local pid=$!
        echo "$pid" > "$PID_FILE"
        sleep 2

        if is_running; then
            echo -e "${GREEN}✅ ${APP_NAME} started (PID: $pid)${NC}"
            echo -e "${GREEN}Logs: tail -f $LOG_FILE${NC}"
            return 0
        fi

        echo -e "${RED}❌ Failed to start ${APP_NAME}. See logs for details.${NC}"
        rm -f "$PID_FILE"
        return 1
    else
        NODE_ENV=development PORT="$port" npm run start:dev
    fi
}

status_service() {
    if is_running; then
        local pid
        pid=$(cat "$PID_FILE")
        echo -e "${GREEN}${APP_NAME} running (PID: ${pid})${NC}"
        echo -e "${YELLOW}Recent logs:${NC}"
        tail -5 "$LOG_FILE" 2>/dev/null || echo "No logs yet"
    else
        echo -e "${RED}${APP_NAME} is not running${NC}"
    fi
}

case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        stop_service
        sleep 1
        start_service
        ;;
    status)
        status_service
        ;;
    logs)
        ensure_log_dir
        tail -f "$LOG_FILE"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
