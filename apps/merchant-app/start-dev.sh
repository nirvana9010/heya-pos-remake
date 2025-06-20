#!/bin/bash

# Start merchant app with auto-restart on crash
while true; do
  echo "Starting merchant app on port 3002..."
  npm run dev
  
  # If the app exits, wait a bit before restarting
  echo "Merchant app crashed or exited. Restarting in 5 seconds..."
  sleep 5
done