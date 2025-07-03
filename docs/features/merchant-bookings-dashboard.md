# Feature: Merchant Bookings Manager

**Date Implemented**: Various dates (ongoing development)  
**Implemented By**: Original developers + Claude Code Session  
**Risk Level**: HIGH  
**Related Ticket/Issue**: Bookings management and organization

## 📋 Quick Reference

**What It Does**: Merchant-side dashboard for managing customer bookings (NOT the customer booking flow)  
**Where To Find It**: `apps/merchant-app/src/app/(dashboard)/bookings/BookingsManager.tsx`  
**How To Test It**: Navigate to /bookings in merchant dashboard  
**Key Dependencies**: React Query, date-fns, Lucide icons, API client

## 🎯 Business Context

### Why This Feature Exists
Merchants need a centralized dashboard to view, manage, and track all customer bookings. This is the merchant's command center for daily operations - completely separate from the customer-facing booking app.

### User Story
As a merchant, I want to see all my bookings in one place so that I can manage my daily schedule, process payments, and track business metrics.

### Success Metrics
- [ ] Merchants can quickly find and manage bookings
- [ ] Real-time updates reflect booking status changes
- [ ] Efficient filtering reduces time to find specific bookings
- [ ] Bulk operations save time for common tasks

## 🏗️ Technical Implementation

### Architecture Decision
The system uses a client-side filtering approach with comprehensive state management to provide instant UI updates and responsive filtering without server round-trips for every interaction.

### Files Modified/Created
```
CREATED:
- apps/merchant-app/src/app/(dashboard)/bookings/BookingsManager.tsx - Main bookings management component
- apps/merchant-app/src/app/(dashboard)/bookings/page.tsx - Page wrapper with dynamic loading
- apps/merchant-app/src/app/(dashboard)/bookings/[id]/page.tsx - Individual booking detail view
- apps/merchant-app/src/app/(dashboard)/bookings/[id]/edit/page.tsx - Edit booking page
- apps/merchant-app/src/app/(dashboard)/bookings/new/page.tsx - Create new booking page

SUPPORTING:
- apps/merchant-app/src/components/BookingActions.tsx - Reusable booking action buttons
- apps/merchant-app/src/components/BookingDetailsSlideOut.tsx - Slide-out panel for details
- apps/merchant-app/src/lib/api-client.ts - API client methods for bookings
```

### Database Changes
```sql
-- No direct database changes - uses existing Booking schema
-- Fetches data through API endpoints
```

### API Changes
```typescript
// Main endpoints used by BookingsManager
GET /api/v2/bookings
  Query params: { status?, from?, to?, staffId?, paymentStatus? }
  Response: Booking[]
  
GET /api/v2/staff
  Response: Staff[]
  
GET /api/v2/merchant/settings
  Response: MerchantSettings

PATCH /api/v2/bookings/:id
  Request: Partial<Booking>
  Response: Booking
  
POST /api/v2/bookings/bulk-actions
  Request: { bookingIds: string[], action: string }
  Response: { success: boolean }
```

### Key Components/Functions
```typescript
BookingsManager
  Location: BookingsManager.tsx
  Purpose: Main merchant dashboard for booking management
  Used by: Merchant dashboard layout
  
loadBookings()
  Purpose: Fetches bookings based on date filter
  Triggers: On mount, date filter change
  
filterBookings()
  Purpose: Client-side filtering of loaded bookings
  Triggers: On search, status, staff, payment filter changes
  
groupBookingsByDate()
  Purpose: Groups bookings into Today/Tomorrow/This Week sections
  Used by: Render method for organized display
```

## 🔗 Integration Points

### Upstream Dependencies
- [ ] Authentication system - Requires valid merchant token
- [ ] API v2 endpoints - All data fetched through REST API
- [ ] Merchant settings - For timezone and configuration

### Downstream Impact
- [ ] Calendar view - Shows same bookings in calendar format
- [ ] Payment system - Processes payments through PaymentDialog
- [ ] Notification system - Updates may trigger notifications
- [ ] Analytics - Booking data feeds into reports

### Critical Paths
1. Page load → Check auth → Fetch bookings/staff/settings → Display grouped bookings
2. Filter change → Client-side filter → Update display immediately
3. Action click → API call → Update local state → Show success/error toast

## 🧪 Testing

### Manual Testing Checklist
- [ ] Navigate to /bookings - verify bookings load
- [ ] Search for customer name - verify instant filtering
- [ ] Filter by status (confirmed, completed, etc.) - verify correct results
- [ ] Filter by staff member - verify filtering works
- [ ] Filter by payment status - verify paid/unpaid filtering
- [ ] Click booking for details - verify slide-out opens
- [ ] Use bulk select and send reminders - verify action completes
- [ ] Export bookings - verify CSV download
- [ ] Click quick stats - verify counts are accurate

## ⚠️ Edge Cases & Gotchas

### Handled Edge Cases
- ✅ No bookings state - Shows empty state with CTA
- ✅ Failed API calls - Shows error toast, keeps previous data
- ✅ Timezone handling - Converts all times to merchant timezone

### Known Limitations
- ⚠️ Client-side filtering can be slow with 1000+ bookings
- ⚠️ No real-time updates - Requires manual refresh
- ⚠️ Search doesn't include service names (only customer/staff)
- ⚠️ Date range picker not fully implemented

### Performance Notes
- All filtering happens client-side for instant feedback
- Initial load fetches all bookings for selected period
- Consider pagination for merchants with high booking volume

## 🐛 Debugging Guide

### Common Issues

**Issue**: Bookings not showing up
- Check: Browser console for API errors
- Check: Network tab - is /api/v2/bookings returning data?
- Check: Date filter - might be set to wrong period
- Fix: Check authentication token is valid

**Issue**: Filters not working
- Check: Console for JavaScript errors
- Check: Filter state in React DevTools
- Fix: Clear filters and try again

**Issue**: Slow performance with many bookings
- Check: Number of bookings being filtered
- Check: Browser performance profiler
- Fix: Implement server-side filtering/pagination

### Debug Commands
```bash
# Check API responses
curl -H "Authorization: Bearer $TOKEN" localhost:3003/api/v2/bookings

# Monitor performance
pm2 logs merchant-app --lines 50 | grep BookingsManager

# Check for errors
pm2 logs merchant-app | grep -i error
```

### Key Log Entries
```
[BookingsManager] Component rendering...
[BookingsManager] Token exists: true
[BookingsManager] Token found, calling loadBookings...
[BookingsManager] Bookings loaded: [count]
```

## 🔄 Maintenance Notes

### Safe to Modify
- ✅ Filter options and UI labels
- ✅ Grouping logic (Today/Tomorrow/This Week)
- ✅ Quick stats calculations
- ✅ Export formatting

### Modify with Caution
- ⚠️ API client methods - affects all components
- ⚠️ Booking status logic - must match backend
- ⚠️ Date/timezone handling - critical for accuracy

### Do NOT Modify Without Full Understanding
- ❌ Authentication flow - can break entire dashboard
- ❌ State management logic - complex interdependencies
- ❌ API response parsing - must match backend exactly

## 📊 Monitoring

### Metrics to Track
- Page load time - Should be < 2 seconds
- Filter response time - Should be < 100ms
- API response time - Track slow queries
- Error rate - Monitor failed API calls

### Alerts to Configure
- API timeout > 5 seconds - Indicates backend issues
- Error rate > 5% - Something is broken
- No bookings loaded - Possible data issue

## 🔗 Related Documentation

- [Booking States Documentation](./booking-status-lifecycle.md)
- [Calendar View Documentation](./calendar.md)
- [Customer Booking App](./customer-booking-app.md)
- [API v2 Documentation](../api/v2-endpoints.md)

## 📝 Additional Notes

### Distinction from Customer Booking App
**IMPORTANT**: This is the merchant-side management interface, NOT the customer booking flow:
- **BookingsManager** (this component) = Merchant dashboard for managing bookings
- **booking-app** = Separate Next.js app where customers make bookings
- Different codebases, different purposes, different users

### Recent Changes (2025-07)
1. Renamed from `BookingsPageContent` to `BookingsManager` for clarity
2. Updated all console.log references to use [BookingsManager] prefix
3. Created this documentation to prevent confusion

### Recommended Improvements
1. Implement server-side pagination for large datasets
2. Add WebSocket/SSE for real-time updates
3. Include service names in search functionality
4. Complete date range picker implementation
5. Add keyboard shortcuts for common actions

---

**Last Updated**: 2025-07-01  
**Next Review Date**: 2025-10-01

<!-- 
Template Usage Notes:
- This documents the MERCHANT side of bookings
- Always clarify this is NOT the customer booking interface
- Keep the distinction clear to prevent developer confusion
-->