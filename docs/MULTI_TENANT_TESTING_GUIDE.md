# Multi-Tenant Testing Guide

## ✅ What We've Built

### 1. Multi-Tenant Booking System
- Each merchant has their own unique booking URL
- Complete data isolation between merchants
- Dynamic merchant detection from URL

### 2. Test Merchants Created

#### Hamilton Beauty Spa
- **Subdomain**: `hamilton`
- **URL**: http://localhost:3001/hamilton
- **Login**: Username: `HAMILTON`, Password: `demo123`
- **Theme**: Beauty & wellness services

#### Zen Wellness Spa
- **Subdomain**: `zen-wellness`
- **URL**: http://localhost:3001/zen-wellness
- **Login**: Username: `ZENWELLNESS`, Password: `demo456`
- **Theme**: Holistic wellness & yoga

### 3. Admin API Endpoints
- **List Merchants**: `GET /api/v1/admin/merchants`
- **Create Merchant**: `POST /api/v1/admin/merchants`

## 🧪 Testing Multi-Tenancy

### Step 1: Visit Different Merchant URLs
1. Open http://localhost:3001/hamilton
   - Should show "Hamilton Beauty Spa"
   - Pink/purple theme
   - Beauty services (facials, massages, etc.)

2. Open http://localhost:3001/zen-wellness
   - Should show "Zen Wellness Spa"
   - Green/teal theme
   - Wellness services (yoga, meditation, etc.)

3. Try invalid merchant: http://localhost:3001/invalid-merchant
   - Should show error page with helpful message

### Step 2: Test Merchant Selector
Visit http://localhost:3001/merchant-selector to see both merchants side-by-side

### Step 3: Verify Data Isolation
```bash
# Check Hamilton services
curl "http://localhost:3000/api/v1/public/services?subdomain=hamilton" | grep name

# Check Zen Wellness services
curl "http://localhost:3000/api/v1/public/services?subdomain=zen-wellness" | grep name

# Results should be completely different
```

### Step 4: Create New Merchant via API
```bash
curl -X POST http://localhost:3000/api/v1/admin/merchants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Salon",
    "email": "admin@testsalon.com",
    "phone": "+61 2 1234 5678",
    "subdomain": "test-salon",
    "username": "TESTSALON",
    "password": "test123"
  }'
```

## 📊 Verify Complete Isolation

### Database Level
Each merchant has separate:
- Services
- Staff members
- Customers
- Bookings
- Settings

### API Level
All public endpoints require merchant subdomain:
- `/api/v1/public/merchant-info?subdomain=hamilton`
- `/api/v1/public/services?subdomain=hamilton`
- `/api/v1/public/staff?subdomain=hamilton`

### Frontend Level
- Merchant context loaded based on URL
- All API calls automatically include merchant context
- UI shows merchant-specific branding

## 🔧 How It Works

1. **URL Detection**
   - Middleware detects merchant from URL path
   - Example: `/hamilton` → merchant subdomain = "hamilton"

2. **Merchant Context**
   - React context provider fetches merchant data
   - All components receive merchant info

3. **API Integration**
   - API client automatically adds merchant subdomain
   - Backend validates and scopes all queries

4. **Error Handling**
   - Invalid merchants show friendly error page
   - Development mode shows test merchant links

## 🚀 Production Considerations

### For Production Deployment:
1. Switch to subdomain-based routing:
   - `hamilton.bookings.yoursite.com`
   - Set `NEXT_PUBLIC_MERCHANT_DETECTION_MODE=subdomain`

2. Configure DNS:
   - Wildcard subdomain: `*.bookings.yoursite.com`
   - Point to booking app server

3. Security:
   - Add rate limiting per merchant
   - Implement merchant API keys
   - Add merchant admin authentication

## 📝 Quick Commands

```bash
# List all merchants
curl http://localhost:3000/api/v1/admin/merchants

# Create new merchant via script
cd apps/api && npm run prisma:seed:zen

# Test merchant endpoint
curl "http://localhost:3000/api/v1/public/merchant-info?subdomain=hamilton"

# View merchant in booking app
open http://localhost:3001/hamilton
```

## 🎯 Key Takeaways

1. **True Multi-Tenancy**: Each merchant is completely isolated
2. **Easy Testing**: Multiple test merchants for comparison
3. **Production Ready**: Path-based for dev, subdomain-based for prod
4. **Extensible**: Easy to add new merchants via API or scripts