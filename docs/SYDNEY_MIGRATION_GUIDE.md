# Sydney Migration Guide - Moving from Railway to Sydney Hosting

## Why Move to Sydney?

- Database is in Sydney (Supabase ap-southeast-2)
- Most users are in Sydney
- Current setup has 700ms latency per database query
- Moving would reduce this to 10-50ms

## Recommended: Fly.io Migration

### Prerequisites
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login
```

### Step 1: Prepare Your App

1. Create `fly.toml` in your API directory:

```toml
app = "heya-pos-api"
primary_region = "syd"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

### Step 2: Set Up Secrets

```bash
# Set your environment variables
fly secrets set DATABASE_URL="postgresql://..." 
fly secrets set REDIS_URL="..."
fly secrets set JWT_SECRET="..."
# ... add all your env vars
```

### Step 3: Deploy

```bash
cd apps/api
fly launch --region syd --name heya-pos-api
fly deploy
```

### Step 4: Set Up Redis in Sydney

```bash
fly redis create --region syd --name heya-pos-redis
# Get the Redis URL and add it to your secrets
```

### Step 5: Update Your Frontend Apps

Update API endpoints in your frontend apps to point to:
```
https://heya-pos-api.fly.dev/api
```

## Alternative: Render.com

1. Connect your GitHub repo
2. Create new Web Service
3. Select Sydney region
4. Set environment variables
5. Deploy

## Post-Migration Checklist

- [ ] Test all API endpoints
- [ ] Verify database connectivity (<50ms latency)
- [ ] Update DNS/API endpoints in frontend apps
- [ ] Set up monitoring (Fly.io has built-in Grafana)
- [ ] Configure auto-scaling rules
- [ ] Set up health checks
- [ ] Test payment processing
- [ ] Verify Redis caching works
- [ ] Load test the new setup

## Expected Performance Improvements

| Operation | Before (SE Asia → Sydney) | After (Sydney → Sydney) |
|-----------|--------------------------|------------------------|
| Simple Query | 700-1000ms | 10-50ms |
| Payment Flow (15 queries) | 10-15 seconds | 0.5-1 second |
| API Response Time | 1500-2000ms | 100-200ms |

## Cost Comparison

### Railway (Current)
- ~$20/month for API hosting
- High data transfer costs (cross-region)

### Fly.io (Sydney)
- ~$15-25/month for API hosting
- Minimal data transfer costs (same region)
- Free Redis instance included

## Rollback Plan

If issues arise:
1. Keep Railway running during migration
2. Use DNS to switch between services
3. Can instantly rollback by updating DNS

## Additional Optimizations for Sydney

Once in Sydney, you can:
1. Remove aggressive connection pooling (not needed in same region)
2. Simplify caching strategies
3. Enable prepared statements again
4. Reduce connection pool size