#!/bin/bash
# Railway build script
echo "Setting up standalone package.json for Railway..."
cp package.json.standalone package.json

echo "Installing dependencies..."
npm ci

echo "Generating Prisma client..."
npx prisma generate

echo "Building application..."
npm run build

echo "Build complete!"