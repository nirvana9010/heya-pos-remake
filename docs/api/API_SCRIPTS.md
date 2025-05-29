# API Management Scripts

This document explains the scripts added to the root package.json to help manage the API server and prevent debugging loops.

## Quick Start

```bash
# Start both API and merchant app
npm run dev:all

# Check what's running
npm run ps:check

# Stop everything
npm run stop:all
```

## API Scripts

### Development
- `npm run api:dev` - Start API in development mode with hot reload
- `npm run api:debug` - Run API directly with ts-node (useful for debugging)
- `npm run api:restart` - Stop, clean, and restart the API

### Build & Production
- `npm run api:build` - Build the API
- `npm run api:start` - Build and start API in production mode
- `npm run api:clean` - Remove dist folder

### Troubleshooting
- `npm run api:stop` - Kill any running nest processes
- `npm run api:logs` - Tail the API log file
- `npm run ps:check` - Check if any nest/next processes are running

## Merchant App Scripts
- `npm run merchant:dev` - Start merchant app in development mode
- `npm run merchant:build` - Build merchant app
- `npm run merchant:start` - Start merchant app in production mode

## Combined Scripts
- `npm run dev:all` - Start both API and merchant app concurrently
- `npm run stop:all` - Stop all nest and next processes

## Common Issues & Solutions

### API won't start
```bash
# 1. Check if something is already running
npm run ps:check

# 2. Stop everything
npm run stop:all

# 3. Clean and restart
npm run api:restart
```

### Build errors
```bash
# Clean the dist folder and rebuild
npm run api:clean
npm run api:build
```

### Port conflicts
The API runs on port 3000 and merchant app on port 3002 by default.
Check `.env` files to change ports if needed.

### Debugging issues
```bash
# Run API directly without nest CLI
npm run api:debug

# Check logs
npm run api:logs
```

## Important Notes
- Always use `npm run stop:all` before closing terminal to ensure clean shutdown
- The API must be running for the merchant app to work properly
- If you see "MODULE_NOT_FOUND" errors, run `npm run api:build`