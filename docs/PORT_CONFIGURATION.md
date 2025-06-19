# Port Configuration Guide

## Standard Port Assignments

| Service          | Port | Environment Variable    | Purpose                        |
|------------------|------|-------------------------|--------------------------------|
| API Server       | 3000 | PORT                    | NestJS backend API             |
| Booking App      | 3001 | -                       | Customer-facing booking site   |
| Merchant App     | 3002 | -                       | Merchant POS interface         |
| Admin Dashboard  | 3003 | -                       | Admin management interface     |

## Common Issues and Solutions

### Issue 1: "Failed to fetch" on login
**Cause**: API not running or wrong port
**Solution**: 
```bash
# Check if API is running
curl http://localhost:3000/api

# If not, start it
cd apps/api && npm run start:dev
```

### Issue 2: "Cannot find module './496.js'" 
**Cause**: Corrupted Next.js build cache
**Solution**:
```bash
# Clean and restart
rm -rf apps/merchant-app/.next
cd apps/merchant-app && npm run dev
```

### Issue 3: "EADDRINUSE: address already in use"
**Cause**: Previous process still running
**Solution**:
```bash
# Kill process on specific port (e.g., 3000)
lsof -ti:3000 | xargs kill -9

# Or use the stop script
./scripts/dev-stop.sh
```

### Issue 4: Multiple processes on same port
**Cause**: Zombie processes from improper shutdown
**Solution**:
```bash
# Kill all Node processes
pkill -f "node"

# Use proper startup script
./scripts/dev-start.sh
```

## Quick Commands

### Start Everything
```bash
./scripts/dev-start.sh
```

### Stop Everything
```bash
./scripts/dev-stop.sh
```

### Check Status
```bash
./scripts/dev-status.sh
```

### Clean Start (with cache clear)
```bash
./scripts/dev-start.sh --clean
```

## Environment Variables

### API (.env)
```
PORT=3000
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-secret-key
```

### Frontend Apps
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Debugging Network Issues

1. **Check API is accessible**:
   ```bash
   curl http://localhost:3000/api
   ```

2. **Test CORS**:
   ```bash
   curl -H "Origin: http://localhost:3002" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: content-type" \
        -X OPTIONS \
        http://localhost:3000/api/auth/merchant/login -v
   ```

3. **Check all ports**:
   ```bash
   netstat -tlnp | grep -E "(3000|3001|3002|3003)"
   ```

## Logs Location

All logs are saved in the `logs/` directory:
- `logs/api.log` - Backend API logs
- `logs/merchant.log` - Merchant app logs
- `logs/booking.log` - Booking app logs
- `logs/admin.log` - Admin dashboard logs

## Best Practices

1. **Always use the scripts** to start/stop services
2. **Check status** before starting if something seems wrong
3. **Clean start** if you encounter webpack/build errors
4. **Monitor logs** for early error detection
5. **Never use random ports** - stick to the standard assignments