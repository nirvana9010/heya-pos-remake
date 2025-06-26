#!/bin/bash

# Quick restart script for Heya POS development
# Stops all services cleanly then starts them again

echo "🔄 Restarting Heya POS Development Environment..."
echo ""

# Stop all services
./scripts/dev-stop.sh

# Wait a moment for processes to fully terminate
echo ""
echo "⏳ Waiting for services to fully stop..."
sleep 3

# Start all services
./scripts/dev-start.sh $@