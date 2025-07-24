#!/bin/bash

# Fly.io Deployment Script for Heya POS API
# This script handles the deployment to Sydney region

set -e

echo "🚀 Starting Fly.io deployment to Sydney..."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Please install it first:"
    echo "curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if logged in
if ! fly auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Please run: fly auth login"
    exit 1
fi

cd apps/api

# First time setup
if [ ! -f "fly.toml" ]; then
    echo "❌ fly.toml not found. Please ensure it exists in apps/api/"
    exit 1
fi

# Launch app if it doesn't exist
if ! fly status &> /dev/null; then
    echo "📦 First time deployment - launching app..."
    fly launch --copy-config --name heya-pos-api --region syd --no-deploy
    
    echo "⚙️ Setting secrets..."
    echo "Please run the following commands to set your secrets:"
    echo ""
    echo "fly secrets set DATABASE_URL='your-database-url'"
    echo "fly secrets set JWT_SECRET='your-jwt-secret'"
    echo "fly secrets set REDIS_URL='your-redis-url'"
    echo "fly secrets set SUPABASE_URL='your-supabase-url'"
    echo "fly secrets set SUPABASE_ANON_KEY='your-supabase-anon-key'"
    echo "fly secrets set SUPABASE_SERVICE_KEY='your-supabase-service-key'"
    echo ""
    echo "Then run this script again to deploy."
    exit 0
fi

# Deploy
echo "🚀 Deploying to Fly.io Sydney..."
fly deploy --strategy immediate

# Show status
echo "✅ Deployment complete!"
fly status

echo ""
echo "🌐 Your API is available at: https://heya-pos-api.fly.dev"
echo ""
echo "📊 View logs: fly logs"
echo "📈 View monitoring: fly dashboard"