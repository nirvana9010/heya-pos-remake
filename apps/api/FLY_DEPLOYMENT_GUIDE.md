# Fly.io Sydney Deployment Guide

## Prerequisites

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Create Fly.io account and login:
```bash
fly auth login
```

## Initial Setup

### 1. Launch the app (first time only)

```bash
cd apps/api
fly launch --copy-config --name heya-pos-api --region syd --no-deploy
```

### 2. Set Environment Variables

```bash
# Database (use your Railway connection string)
fly secrets set DATABASE_URL="postgresql://postgres.hpvnmqvdgkfeykekosrh:***REMOVED***@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=20&pool_timeout=30&statement_cache_size=0"

# Authentication
fly secrets set JWT_SECRET="your-jwt-secret-here"
fly secrets set JWT_REFRESH_SECRET="your-jwt-refresh-secret-here"

# Supabase (for real-time notifications)
fly secrets set SUPABASE_URL="https://hpvnmqvdgkfeykekosrh.supabase.co"
fly secrets set SUPABASE_ANON_KEY="your-anon-key"
fly secrets set SUPABASE_SERVICE_KEY="your-service-key"

# Payment Gateway
fly secrets set PAYMENT_PROVIDER="MOCK"  # or TYRO
fly secrets set PAYMENT_API_KEY="your-key"
fly secrets set PAYMENT_SECRET_KEY="your-secret"

# Optional: Email/SMS
fly secrets set SENDGRID_API_KEY="your-sendgrid-key"
fly secrets set TWILIO_ACCOUNT_SID="your-twilio-sid"
fly secrets set TWILIO_AUTH_TOKEN="your-twilio-token"
fly secrets set TWILIO_FROM_NUMBER="+1234567890"
```

### 3. Create Redis Instance (for caching)

```bash
fly redis create --name heya-pos-redis --region syd --no-replicas
```

Get the Redis URL:
```bash
fly redis status heya-pos-redis
```

Set it as a secret:
```bash
fly secrets set REDIS_URL="redis://default:password@heya-pos-redis.internal:6379"
```

### 4. Deploy

```bash
fly deploy
```

## Deployment Commands

### Deploy
```bash
cd apps/api
fly deploy
```

### View logs
```bash
fly logs
```

### SSH into container
```bash
fly ssh console
```

### View app status
```bash
fly status
```

### Scale up/down
```bash
# Scale to 2 instances
fly scale count 2

# Scale memory
fly scale memory 1024

# Scale to specific regions
fly regions set syd
```

## Database Migrations

Run migrations after deployment:
```bash
fly ssh console -C "cd /app/apps/api && npx prisma migrate deploy"
```

## Monitoring

### View metrics
```bash
fly dashboard
```

### Check health
```bash
curl https://heya-pos-api.fly.dev/health
```

## Troubleshooting

### Connection timeouts
If you see connection timeouts, ensure:
1. Database allows connections from Fly.io IPs
2. Secrets are set correctly
3. Region is set to Sydney

### Memory issues
```bash
# Check memory usage
fly status

# Increase memory if needed
fly scale memory 512
```

## GitHub Actions Setup

1. Get your Fly API token:
```bash
fly auth token
```

2. Add it to GitHub secrets as `FLY_API_TOKEN`

3. Push to main branch to trigger deployment

## Performance Expectations

After migration to Sydney:
- Database queries: 10-50ms (was 700ms+)
- API response time: 100-200ms (was 1500ms+)
- Payment processing: <1 second (was 10+ seconds)

## Rollback

If needed, you can quickly rollback:
```bash
fly releases
fly deploy -i <previous-release-id>
```