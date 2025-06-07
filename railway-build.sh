#!/bin/bash
# Railway build script for monorepo

echo "🚀 Starting Railway build for HEYA POS API..."

# Navigate to root
cd /app

# Install all dependencies at root level
echo "📦 Installing dependencies..."
npm install

# Build the shared packages first
echo "🔨 Building shared packages..."
cd packages/types && npm run build && cd ../..
cd packages/utils && npm run build && cd ../..
cd packages/ui && npm run build && cd ../..

# Now build the API
echo "🏗️ Building API..."
cd apps/api

# Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate

# Build the API
echo "📦 Building NestJS application..."
npm run build

echo "✅ Build complete!"