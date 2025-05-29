# Frontend to API Integration Guide

This guide shows how to connect the frontend applications to the real API instead of using mock data.

## Current State

- **API**: Running on http://localhost:3000/api with SQLite database
- **Frontend Apps**: Currently using mock data from `@heya-pos/shared/mock-data`
- **API Client**: Available in `@heya-pos/shared/api-client`

## Migration Steps

### 1. Environment Variables

Add to each app's `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 2. Replace Mock API with Real API Client

Example: Converting the Merchant App login page

**Before (using mock data):**
```typescript
import { mockApi } from '@heya-pos/shared';

const handleSubmit = async (e: React.FormEvent) => {
  try {
    const result = await mockApi.login(
      formData.email,
      formData.password,
      formData.merchantCode
    );
    
    router.push('/pin');
  } catch (error) {
    toast({
      title: "Login failed",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

**After (using real API):**
```typescript
import { apiClient } from '@heya-pos/shared';

const handleSubmit = async (e: React.FormEvent) => {
  try {
    const result = await apiClient.merchantLogin({
      email: formData.email,
      password: formData.password,
      merchantCode: formData.merchantCode
    });
    
    // Token is automatically stored by apiClient
    router.push('/pin');
  } catch (error) {
    toast({
      title: "Login failed",
      description: error.message,
      variant: "destructive",
    });
  }
};
```

### 3. API Client Methods

The `apiClient` provides these methods:

#### Authentication
- `merchantLogin(credentials)` - Merchant login
- `staffPin(credentials)` - Staff PIN verification
- `logout()` - Logout
- `getMe()` - Get current user

#### Services
- `getServices(params)` - List services with filters
- `getService(id)` - Get single service
- `createService(data)` - Create new service
- `updateService(id, data)` - Update service
- `deleteService(id)` - Delete service

#### Service Categories
- `getServiceCategories()` - List all categories
- `createServiceCategory(data)` - Create category
- `updateServiceCategory(id, data)` - Update category
- `deleteServiceCategory(id)` - Delete category

#### Customers
- `getCustomers(params)` - List customers with search
- `getCustomer(id)` - Get single customer
- `createCustomer(data)` - Create customer
- `updateCustomer(id, data)` - Update customer
- `deleteCustomer(id)` - Delete customer

#### Bookings
- `getBookings(params)` - List bookings with filters
- `getBooking(id)` - Get single booking
- `createBooking(data)` - Create booking
- `updateBooking(id, data)` - Update booking
- `updateBookingStatus(id, status)` - Update booking status
- `cancelBooking(id, reason)` - Cancel booking
- `checkAvailability(data)` - Check available time slots

### 4. Handling Loading and Error States

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await apiClient.getServices();
    setServices(response.data);
  } catch (err) {
    setError(err.message || 'Failed to fetch services');
  } finally {
    setLoading(false);
  }
};
```

### 5. Protected Routes

Create a hook to check authentication:

```typescript
// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@heya-pos/shared';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiClient.getMe();
        setUser(response.user);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  return { user, loading };
}
```

### 6. CORS Configuration

The API is already configured to accept requests from the frontend apps. If you encounter CORS issues, ensure the API's CORS configuration includes your frontend URLs.

## Testing the Integration

1. Start the API server:
   ```bash
   cd apps/api
   npm run start:dev
   ```

2. Start the frontend app:
   ```bash
   cd apps/merchant-app
   npm run dev
   ```

3. Test login with credentials:
   - Merchant Code: `HAMILTON`
   - Email: `admin@hamiltonbeauty.com`
   - Password: `demo123`
   - Staff PINs: `1234`, `5678`, or `9012`

## Gradual Migration

You can migrate page by page:
1. Start with authentication pages
2. Then move to read-only pages (dashboard, lists)
3. Finally migrate create/update/delete operations

Keep the mock data as a fallback during development and for testing.