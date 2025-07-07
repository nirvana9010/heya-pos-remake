#!/bin/bash
# Load environment variables and start API
cd apps/api
source .env
export $(cat .env | grep -v '^#' | xargs)
npm run start:dev