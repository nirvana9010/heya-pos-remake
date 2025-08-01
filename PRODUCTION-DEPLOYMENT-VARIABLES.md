# Production Deployment Variables Checklist

## 🚀 Fly.io (API Backend)

### Required Variables
```bash
# Database - Fly.io PostgreSQL (internal connection)
DATABASE_URL="postgres://postgres:[YOUR-FLY-POSTGRES-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable"
DIRECT_URL="postgres://postgres:[YOUR-FLY-POSTGRES-PASSWORD]@heya-pos-db.flycast:5432/postgres?sslmode=disable"

# Environment
NODE_ENV=production
PORT=8080  # Fly.io typically uses 8080

# JWT Secrets (MUST GENERATE NEW ONES!)
JWT_SECRET="[GENERATE: openssl rand -base64 32]"
JWT_REFRESH_SECRET="[GENERATE: openssl rand -base64 32]"

# CORS - Update with your production domains
FRONTEND_URL=https://your-merchant-app.vercel.app
FRONTEND_URLS=https://your-merchant-app.vercel.app,https://your-booking-app.vercel.app,https://your-admin.vercel.app

# Database Optimization
DATABASE_CONNECTION_LIMIT=25  # Increase for production
PRISMA_CLIENT_ENGINE_TYPE=binary

# Session
SESSION_TIMEOUT_HOURS=168  # 7 days for production

# Logging
LOG_LEVEL=info  # Change from debug
DEBUG=false
ENABLE_SWAGGER=false  # Disable in production

# Memory
NODE_OPTIONS=--max-old-space-size=2048  # Adjust based on Fly.io instance
```

### Optional Variables (if using these services)
```bash
# Email - SendGrid
SENDGRID_API_KEY=your-production-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME="Heya POS"

# SMS - Twilio  
TWILIO_ACCOUNT_SID=your-production-twilio-sid
TWILIO_AUTH_TOKEN=your-production-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Payment
PAYMENT_PROVIDER=TYRO  # Change from MOCK
PAYMENT_MERCHANT_ID=your-tyro-merchant-id
```

### Fly.io Setup Commands
```bash
# Set secrets (sensitive values)
fly secrets set JWT_SECRET="$(openssl rand -base64 32)"
fly secrets set JWT_REFRESH_SECRET="$(openssl rand -base64 32)"
fly secrets set DATABASE_URL="postgresql://..."

# Set regular environment variables
fly config env -a your-api-app-name
```

## 🌐 Vercel (Frontend Apps)

### Merchant App Variables
```bash
# API Configuration - Point to your Fly.io API
NEXT_PUBLIC_API_URL=https://your-api.fly.dev/api

# Feature Flags - Disable for production
NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false
NEXT_PUBLIC_ENABLE_DEBUG=false
NEXT_PUBLIC_ENABLE_DEVTOOLS=false
NEXT_PUBLIC_ENABLE_PERFORMANCE_MARKS=false

# Tyro Integration (if using)
NEXT_PUBLIC_TYRO_API_KEY=your-production-tyro-api-key
NEXT_PUBLIC_TYRO_CLIENT_ID=your-production-tyro-client-id
NEXT_PUBLIC_TYRO_MERCHANT_ID=your-production-tyro-merchant-id
NEXT_PUBLIC_TYRO_ENVIRONMENT=production

# Remove these in production
# DEV_MERCHANT_TOKEN= (remove entirely)
# WATCHPACK_POLLING= (remove entirely)
```

### Booking App Variables
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-api.fly.dev/api

# Merchant Detection
NEXT_PUBLIC_MERCHANT_DETECTION_MODE=subdomain  # or 'path' based on your setup

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=false
```

### Admin Dashboard Variables
```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-api.fly.dev/api

# Feature Flags
NEXT_PUBLIC_ENABLE_DEBUG=false
```

## 🔒 Security Checklist

### Before Deploying:
- [ ] Generate NEW JWT secrets (don't reuse development secrets)
- [ ] Remove all development/debug flags
- [ ] Update CORS URLs to match production domains
- [ ] Disable Swagger in production
- [ ] Remove DEV_MERCHANT_TOKEN entirely
- [ ] Set appropriate LOG_LEVEL (info or warn, not debug)

### Database Security:
- [ ] Ensure DATABASE_URL uses SSL (`sslmode=require`)
- [ ] Consider using connection pooling for high traffic
- [ ] Set appropriate DATABASE_CONNECTION_LIMIT

### Domain Configuration:
- [ ] Update FRONTEND_URL to production domain
- [ ] Update FRONTEND_URLS to include all production domains
- [ ] Configure proper CORS for your domains

## 📝 Deployment Order

1. **Deploy API to Fly.io first**
   - Set all environment variables
   - Run database migrations: `fly ssh console -C "cd app && npx prisma migrate deploy"`
   - Verify API is accessible

2. **Deploy Frontend Apps to Vercel**
   - Update NEXT_PUBLIC_API_URL to point to Fly.io API
   - Deploy merchant-app
   - Deploy booking-app
   - Deploy admin-dashboard

## 🚨 Common Issues

1. **CORS Errors**: Make sure FRONTEND_URLS in Fly.io includes all Vercel domains
2. **Database Connection**: Ensure DATABASE_URL has `?sslmode=require`
3. **JWT Errors**: Generate new secrets, don't copy from development
4. **API Not Found**: Check NEXT_PUBLIC_API_URL ends with `/api`

## 🔧 Testing Production

After deployment:
1. Test login functionality
2. Verify database connections
3. Check CORS is working (no console errors)
4. Ensure payment provider is set correctly
5. Test email/SMS if configured