# Deployment Environment Variables

This document lists all required environment variables for deploying the Heya POS applications.

## API Backend (apps/api)

### Required Variables:
- `DATABASE_URL`: The database connection string
  - For SQLite: `file:./prisma/dev.db`
  - For PostgreSQL: `postgresql://user:password@host:port/database`
- `JWT_SECRET`: Secret key for JWT token signing (generate a secure random string)
- `JWT_REFRESH_SECRET`: Secret key for refresh token signing (generate a secure random string)
- `NODE_ENV`: Set to `production` for production deployments

### Optional Variables:
- `PORT`: API server port (defaults to 3000)
- `TZ`: Timezone setting (defaults to 'Australia/Melbourne')

## Merchant App (apps/merchant-app)

### Required Variables:
- `NEXT_PUBLIC_API_URL`: The URL of the API backend
  - Development: `http://localhost:3000/api`
  - Production: Your deployed API URL (e.g., `https://your-api.com/api`)

### Optional Variables:
- `NEXT_PUBLIC_TYRO_API_KEY`: Tyro EFTPOS integration API key
- `NEXT_PUBLIC_TYRO_MERCHANT_ID`: Tyro merchant ID
- `NEXT_PUBLIC_TYRO_ENVIRONMENT`: Tyro environment (`sandbox` or `production`)

## Booking App (apps/booking-app)

### Required Variables:
- `NEXT_PUBLIC_API_URL`: The URL of the API backend
  - Development: `http://localhost:3000/api`
  - Production: Your deployed API URL (e.g., `https://your-api.com/api`)

## Admin Dashboard (apps/admin-dashboard)

### Required Variables:
- `NEXT_PUBLIC_API_URL`: The URL of the API backend
  - Development: `http://localhost:3000/api`
  - Production: Your deployed API URL (e.g., `https://your-api.com/api`)

## Deployment Platforms

### Vercel
For Vercel deployments, set these environment variables in the Vercel dashboard:
1. Navigate to your project settings
2. Go to "Environment Variables"
3. Add each variable for the appropriate environment (Production/Preview/Development)

### Fly.io
For Fly.io deployments, the production environment files already contain:
- API URL: `https://heya-pos-api.fly.dev/api`

### Docker
When using Docker, pass environment variables via:
- `.env` files
- Docker Compose `environment` section
- `docker run -e` flags

## Security Notes
1. Never commit `.env` files with real credentials to version control
2. Use strong, unique values for JWT secrets
3. Rotate secrets regularly
4. Use different values for development and production environments
5. Ensure HTTPS is used for all production API URLs