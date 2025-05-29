# Heya POS System

A modern Point of Sale system built with Next.js, NestJS, and PostgreSQL.

## Architecture

- **Frontend Apps**: 
  - Merchant App (Port 3001) - Staff interface for managing bookings, customers, and services
  - Booking App (Port 3002) - Customer-facing booking interface
  - Admin Dashboard (Port 3003) - System administration
  
- **Backend**: NestJS API (Port 3000)
- **Database**: PostgreSQL with Prisma ORM
- **UI Components**: Shared component library using shadcn/ui

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (for PostgreSQL)
- npm or pnpm

### Database Setup

1. Start PostgreSQL using Docker:
```bash
docker-compose up -d
```

2. Run database migrations:
```bash
cd apps/api
npm run prisma:migrate
```

3. Seed the database with sample data:
```bash
npm run prisma:seed
```

### Running the Applications

1. Install dependencies:
```bash
npm install
```

2. Start all applications:
```bash
npm run dev
```

This will start:
- API server at http://localhost:3000
- Merchant App at http://localhost:3001
- Booking App at http://localhost:3002
- Admin Dashboard at http://localhost:3003

### Test Credentials

**Merchant Login:**
- Merchant Code: `HAMILTON`
- Email: `admin@hamiltonbeauty.com`
- Password: `demo123`

**Staff PINs:**
- Sarah Johnson (Owner): `1234`
- Emma Williams (Manager): `5678`
- Olivia Brown (Staff): `9012`

## Development

### API Endpoints

The API provides RESTful endpoints for:
- Authentication (`/auth`)
- Bookings (`/bookings`)
- Customers (`/customers`)
- Services (`/services`)
- Service Categories (`/service-categories`)

### Database Management

- View database: `npm run prisma:studio`
- Generate Prisma client: `npm run prisma:generate`
- Create migration: `npm run prisma:migrate`
- Reset database: `npm run prisma:reset`

### Project Structure

```
heya-pos/
├── apps/
│   ├── api/               # NestJS backend API
│   ├── merchant-app/      # Next.js merchant interface
│   ├── booking-app/       # Next.js customer booking
│   └── admin-dashboard/   # Next.js admin interface
├── packages/
│   ├── ui/               # Shared UI components
│   └── shared/           # Shared types and utilities
└── docker-compose.yml    # PostgreSQL setup
```

## Next Steps

1. **Connect Frontend to API**: Replace mock data service with real API calls
2. **Implement WebSocket**: Real-time updates for bookings
3. **Add Authentication**: Implement JWT token management in frontend
4. **Payment Integration**: Add Stripe/Tyro payment processing
5. **Email Notifications**: Booking confirmations and reminders