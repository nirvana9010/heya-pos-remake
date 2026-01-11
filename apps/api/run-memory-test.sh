#!/bin/bash

echo "🔍 Memory Leak Test for Heya POS API"
echo "===================================="

# Kill any existing API processes
echo "📋 Stopping any existing API processes..."
pkill -f "node.*dist/main" || true
sleep 2

# Build the API
echo "🔨 Building API..."
cd /home/nirvana9010/projects/heya-pos-remake/apps/api
npm run build

# Create heap snapshot directory
mkdir -p heap-snapshots

echo ""
echo "🚀 Starting API with memory monitoring..."
echo "  - Hot reload: DISABLED"
echo "  - Memory logging: ENABLED"
echo "  - Heap profiling: ENABLED"
echo "  - Session timeout: 24 hours (was 365 days)"
echo "  - Max sessions: 10,000"
echo ""

# Run with heap profiling and expose GC
NODE_OPTIONS='--max-old-space-size=512 --expose-gc --trace-warnings' \
HEAP_PROFILE=true \
SESSION_TIMEOUT_HOURS=24 \
MAX_SESSIONS=10000 \
MAX_SESSIONS_PER_USER=10 \
npm run start:heap-profile 2>&1 | tee memory-test.log &

API_PID=$!

echo "✅ API started with PID: $API_PID"
echo ""
echo "📊 Monitoring memory usage..."
echo "  - Heap snapshots will be saved to: ./heap-snapshots/"
echo "  - Memory logs are being written to: memory-test.log"
echo ""
echo "🧪 To test for memory leaks:"
echo "  1. In another terminal, run: cd /home/nirvana9010/projects/heya-pos-remake/apps/api"
echo "  2. Then run: NODE_OPTIONS='--expose-gc' ts-node test-memory-leak.ts"
echo ""
echo "📈 To analyze heap snapshots:"
echo "  1. Open Chrome DevTools"
echo "  2. Go to Memory tab"
echo "  3. Load the .heapsnapshot files"
echo "  4. Compare early vs late snapshots to identify growing objects"
echo ""
echo "Press Ctrl+C to stop the test"

# Wait for the API process
wait $API_PID