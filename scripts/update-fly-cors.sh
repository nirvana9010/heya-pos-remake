#!/bin/bash

# Update Fly.io CORS configuration

echo "Updating Fly.io CORS configuration..."

# Production URLs for the frontend apps
FRONTEND_URLS="https://hub.heyapos.com,https://heya-pos-remake-merchant-app.vercel.app,https://visit.heyapos.com,https://booking.heyapos.com,http://localhost:3001,http://localhost:3002,http://localhost:3003"

# Update the FRONTEND_URLS secret on Fly.io
fly secrets set FRONTEND_URLS="$FRONTEND_URLS" -a heya-pos-api

echo "CORS configuration updated with the following URLs:"
echo "$FRONTEND_URLS"
echo ""
echo "IMPORTANT: Replace the Vercel URLs above with your actual production URLs!"
echo "You can find your Vercel URLs in your Vercel dashboard."
echo ""
echo "To check current secrets:"
echo "fly secrets list -a heya-pos-api"