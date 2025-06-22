#!/bin/bash

# Auto-restart script for Next.js merchant app
echo "Starting merchant app with auto-restart..."

while true; do
  echo "[$(date)] Starting Next.js dev server on port 3002..."
  
  # Run the dev server directly
  npm run dev:direct
  
  # If it exits, wait a bit before restarting
  echo "[$(date)] Dev server stopped. Restarting in 5 seconds..."
  sleep 5
done