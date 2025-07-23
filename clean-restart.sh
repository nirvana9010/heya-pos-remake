#!/bin/bash

# Clean restart script for Heya POS
# This script comprehensively cleans up all processes and restarts services

echo "🧹 Starting clean restart process..."

# 1. Stop all PM2 processes
echo "📛 Stopping PM2 processes..."
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null

# 2. Kill all Node.js processes
echo "🔫 Killing Node.js processes..."
pkill -9 -f "next" 2>/dev/null
pkill -9 -f "nest" 2>/dev/null
pkill -9 -f "node.*3000" 2>/dev/null
pkill -9 -f "node.*3001" 2>/dev/null
pkill -9 -f "node.*3002" 2>/dev/null
pkill -9 -f "node.*3003" 2>/dev/null

# 3. Clear specific ports
echo "🚪 Clearing ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null
lsof -ti:3003 | xargs kill -9 2>/dev/null

# Wait a moment for processes to die
sleep 2

# 4. Clear PM2 logs (optional)
echo "📜 Clearing PM2 logs..."
pm2 flush

# 5. Start services
echo "🚀 Starting services..."

# Start API first
echo "Starting API on port 3000..."
cd apps/api && npm run start:dev &
API_PID=$!

# Wait for API to be ready
echo "Waiting for API to be ready..."
sleep 10

# Start merchant app
echo "Starting Merchant App on port 3002..."
cd ../merchant-app && npm run dev:direct &
MERCHANT_PID=$!

# Start booking app
echo "Starting Booking App on port 3001..."
cd ../booking-app && npm run dev &
BOOKING_PID=$!

# Go back to root
cd ../..

# 6. Status check
echo ""
echo "✅ Clean restart complete!"
echo ""
echo "🔍 Process status:"
ps aux | grep -E "next|nest" | grep -v grep

echo ""
echo "🔍 Port status:"
lsof -i :3000 | head -n 2
lsof -i :3001 | head -n 2
lsof -i :3002 | head -n 2
lsof -i :3003 | head -n 2

echo ""
echo "📍 Services:"
echo "  - API: http://localhost:3000"
echo "  - Booking App: http://localhost:3001"
echo "  - Merchant App: http://localhost:3002"
echo ""
echo "Use 'pm2 logs' to view logs (once services are added to PM2)"