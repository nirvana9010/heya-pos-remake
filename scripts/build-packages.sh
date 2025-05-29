#!/bin/bash

# Build script for Heya POS packages
set -e

echo "🔨 Building Heya POS packages..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf packages/types/dist
rm -rf packages/utils/dist
rm -rf packages/shared/dist
rm -rf packages/ui/dist

# Build packages in order (types -> utils -> shared -> ui)
echo "📦 Building @heya-pos/types..."
cd packages/types
npm run build

echo "📦 Building @heya-pos/utils..."
cd ../utils
npm run build

echo "📦 Building @heya-pos/shared..."
cd ../shared
npm run build

echo "📦 Building @heya-pos/ui..."
cd ../ui
npm run build

echo "✅ All packages built successfully!"
cd ../..