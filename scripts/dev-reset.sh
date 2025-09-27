#!/bin/bash

# Comprehensive cleanup for local dev processes so the next `npm run dev`
# starts from a clean slate.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🧹 Resetting local dev services..."

# Reuse the existing stop script for graceful shutdown + zombie cleanup.
if [ -x "./scripts/dev-stop.sh" ]; then
  ./scripts/dev-stop.sh
else
  echo "⚠️  scripts/dev-stop.sh not found; performing minimal cleanup"
fi

# Kill any lingering turbo dev (sometimes left when terminals close abruptly)
pkill -f "turbo dev" 2>/dev/null || true

# Remove stale PID files so restart scripts don't think services are still running
rm -f /tmp/merchant-app.pid .pids 2>/dev/null || true

echo "✅ Environment reset. You're clear to run 'npm run dev' again."
