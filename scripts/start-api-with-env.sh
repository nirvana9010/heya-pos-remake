#!/bin/bash
# Load environment variables and start API

# Get the root directory
ROOT_DIR="$(dirname "$0")/.."
cd "$ROOT_DIR"

# Determine environment
NODE_ENV=${NODE_ENV:-development}
echo "Starting API in $NODE_ENV mode..."

# Load environment variables based on NODE_ENV
if [ "$NODE_ENV" = "production" ] && [ -f .env.production ]; then
  echo "Loading .env.production file..."
  set -a
  source .env.production
  set +a
elif [ "$NODE_ENV" = "test" ] && [ -f .env.test ]; then
  echo "Loading .env.test file..."
  set -a
  source .env.test
  set +a
elif [ -f .env.$NODE_ENV ]; then
  echo "Loading .env.$NODE_ENV file..."
  set -a
  source .env.$NODE_ENV
  set +a
elif [ -f .env ]; then
  echo "Loading .env file..."
  set -a
  source .env
  set +a
else
  echo "WARNING: No environment file found!"
fi

echo "DATABASE_URL is: ${DATABASE_URL:0:50}..."

# Change to API directory and start
cd apps/api
if [ "$NODE_ENV" = "production" ]; then
  exec npm run start:prod
else
  exec npm run start:dev
fi