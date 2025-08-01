#!/bin/bash

# Update Fly.io CORS configuration

echo "Updating Fly.io CORS configuration..."

# Common production URLs for the frontend apps
# You should replace these with your actual production URLs
FRONTEND_URLS="https://heya-pos-booking.vercel.app,https://heya-pos-merchant.vercel.app,https://booking.heya-pos.com,https://merchant.heya-pos.com,http://localhost:3001,http://localhost:3002,http://localhost:3003"

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