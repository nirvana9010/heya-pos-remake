#!/bin/bash

# Ensure a PostgreSQL endpoint is available on the desired host/port.
# If the port is closed, run the provided command (or a sensible default).

set -euo pipefail

HOST="${DB_HOST:-localhost}"
PORT="${DB_PORT:-5432}"
TIMEOUT="${DB_START_TIMEOUT:-30}"
SLEEP_INTERVAL=1
RUN_IN_BACKGROUND=false
LOG_FILE="${DB_START_LOG:-logs/db-proxy.log}"

read_env_command() {
    local env_file key value rest
    for env_file in .env .env.local; do
        if [ -f "$env_file" ]; then
            while IFS='=' read -r key value rest; do
                if [ "$key" = "DB_START_COMMAND" ]; then
                    if [ -n "$rest" ]; then
                        value="${value}=${rest}"
                    fi
                    DB_START_COMMAND="$value"
                fi
            done <"$env_file"
        fi
        if [ -n "${DB_START_COMMAND:-}" ]; then
            break
        fi
    done
}

strip_quotes() {
    local val="$1"
    val=${val%\"}
    val=${val#\"}
    val=${val%\'}
    val=${val#\'}
    printf '%s' "$val"
}

resolve_start_command() {
    if [ "$#" -gt 0 ]; then
        START_CMD=("$@")
        return 0
    fi

    if [ -z "${DB_START_COMMAND:-}" ]; then
        read_env_command
    fi

    if [ -n "${DB_START_COMMAND:-}" ]; then
        local cleaned
        cleaned=$(strip_quotes "${DB_START_COMMAND}")
        read -r -a START_CMD <<< "$cleaned"
        return 0
    fi

    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        START_CMD=("docker" "compose" "up" "-d" "postgres")
        return 0
    fi

    if command -v docker-compose >/dev/null 2>&1; then
        START_CMD=("docker-compose" "up" "-d" "postgres")
        return 0
    fi

    if command -v flyctl >/dev/null 2>&1; then
        local fly_app
        fly_app="${DB_FLY_APP:-heya-pos-db}"
        START_CMD=("flyctl" "proxy" "${PORT}" "-a" "$fly_app")
        RUN_IN_BACKGROUND=true
        return 0
    fi

    if [ -x "$HOME/.fly/bin/flyctl" ]; then
        local fly_app
        fly_app="${DB_FLY_APP:-heya-pos-db}"
        START_CMD=("$HOME/.fly/bin/flyctl" "proxy" "${PORT}" "-a" "$fly_app")
        RUN_IN_BACKGROUND=true
        return 0
    fi

    cat >&2 <<'EOF'
No start command available and neither Docker Compose nor flyctl were found.
Provide one explicitly, e.g.:
  DB_START_COMMAND="flyctl proxy ${PORT} -a heya-pos-db" $0
or install Docker Compose to use the default postgres container.
EOF
    return 1
}

check_port() {
    if command -v nc >/dev/null 2>&1; then
        nc -z "$HOST" "$PORT" >/dev/null 2>&1
    else
        (echo >/dev/tcp/"$HOST"/"$PORT") >/dev/null 2>&1
    fi
}

resolve_start_command "$@" || exit 1

echo "[INFO] Checking database availability on $HOST:$PORT..."
if check_port; then
    echo "[OK] Database already reachable on $HOST:$PORT"
    exit 0
fi

echo "[WARN] No service detected on $HOST:$PORT"
echo "[INFO] Executing start command: ${START_CMD[*]}"

if [ "$RUN_IN_BACKGROUND" = true ]; then
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "(output redirected to $LOG_FILE)"
    nohup "${START_CMD[@]}" >"$LOG_FILE" 2>&1 &
else
    "${START_CMD[@]}"
fi

echo "[INFO] Waiting for $HOST:$PORT to become available..."
for _ in $(seq 1 "$TIMEOUT"); do
    if check_port; then
        echo "[OK] Database is now reachable on $HOST:$PORT"
        exit 0
    fi
    sleep "$SLEEP_INTERVAL"
done

echo "[ERROR] Database still unavailable on $HOST:$PORT after $TIMEOUT seconds" >&2
exit 1
