#!/bin/bash
# Load environment variables and start API
cd "$(dirname "$0")/../apps/api"
if [ -f .env ]; then
  echo "Loading .env file..."
  set -a
  source .env
  set +a
  echo "DATABASE_URL is: ${DATABASE_URL:0:50}..."
else
  echo "ERROR: .env file not found!"
fi
exec npm run start:dev