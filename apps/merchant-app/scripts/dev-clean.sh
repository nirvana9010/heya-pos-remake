#!/bin/bash

# Development Clean Script - Phase 3 Build System Improvements
# This script cleans all caches and temporary files for a fresh start

echo "🧹 Cleaning development environment..."

# Clean Next.js cache
echo "Removing .next directory..."
rm -rf .next

# Clean node_modules cache
echo "Cleaning node_modules cache..."
rm -rf node_modules/.cache

# Clean Turbo cache
echo "Cleaning Turbo cache..."
rm -rf .turbo

# Clean ESLint cache
echo "Cleaning ESLint cache..."
rm -rf .eslintcache

# Clean TypeScript cache
echo "Cleaning TypeScript cache..."
rm -rf tsconfig.tsbuildinfo

# Clean any lock files that might be corrupted
echo "Cleaning lock files..."
rm -f .next/cache/webpack/.lock

echo "✅ Development environment cleaned!"
echo ""
echo "You can now run 'npm run dev' for a fresh start."