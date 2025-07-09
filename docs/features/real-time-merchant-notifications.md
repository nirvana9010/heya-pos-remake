# Feature: Merchant Notifications System

**Date Implemented**: 2025-01-01  
**Last Updated**: 2025-07-09  
**Implemented By**: Claude Code Session  
**Risk Level**: HIGH (due to unresolved reliability issues)  
**Related Ticket/Issue**: #notifications-implementation

## 📋 Quick Reference

**What It Does**: Provides real-time notifications to merchants about booking events with in-app alerts, browser notifications, and sound alerts  
**Where To Find It**: `apps/api/src/notifications` and `apps/merchant-app/src/contexts/notifications-context.tsx`  
**How To Test It**: Manual testing - create/cancel/modify bookings and observe notifications  
**Key Dependencies**: NestJS EventEmitter, React Query, Browser Notifications API

## 🎯 Business Context

### Why This Feature Exists
Merchants need immediate awareness of booking activity to manage their business effectively. Without real-time notifications, merchants must constantly refresh their dashboard to see new bookings, leading to delayed responses and poor customer experience.

### User Story
As a merchant, I want to receive instant notifications about booking activities so that I can respond quickly to customer needs and manage my schedule effectively.

### Success Metrics
- [ ] Merchants respond to new bookings within 5 minutes on average
- [ ] Reduced customer complaints about slow merchant responses
- [ ] Increased merchant engagement with the platform throughout the day

## 🏗️ Technical Implementation

### Architecture Decision
Implemented a polling-based architecture (5-second intervals) instead of WebSockets for simplicity and reliability. Uses event-driven architecture on the backend with an outbox pattern for guaranteed delivery.

### Files Modified/Created
```
CREATED:
- apps/api/src/notifications/handlers/notification-event.handler.ts - Listens to booking events and creates notifications
- apps/api/src/notifications/entities/merchant-notification.entity.ts - TypeORM entity for notifications
- apps/api/src/notifications/services/merchant-notifications.service.ts - Business logic for notification management
- apps/api/src/notifications/controllers/merchant-notifications.controller.ts - REST API endpoints
- apps/merchant-app/src/contexts/notifications-context.tsx - Frontend state management and browser notifications
- apps/merchant-app/src/lib/query/hooks/use-notifications.ts - React Query hooks for data fetching
- apps/merchant-app/src/components/notifications/* - UI components for notifications

MODIFIED:
- apps/api/src/contexts/bookings/application/services/booking-creation.service.ts
  - Added: Event publishing for new bookings
  - Changed: Emits domain events on booking creation
  - Reason: Trigger notification creation
  
- apps/api/src/contexts/bookings/application/services/booking-update.service.ts
  - Added: Event publishing for booking updates/cancellations
  - Changed: Emits specific events based on status changes
  - Reason: Generate appropriate notifications for each booking state change
```

### Database Changes
```sql
-- New table for merchant notifications
CREATE TABLE merchant_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  priority VARCHAR DEFAULT 'info',
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR,
  action_label VARCHAR,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX idx_merchant_notifications_merchant_read 
ON merchant_notifications(merchant_id, read, created_at DESC);
```

### API Changes
```typescript
// List notifications for a merchant
GET /api/merchant-notifications/:merchantId
  Request: { merchantId: string }
  Response: { data: MerchantNotification[] }
  Breaking change: NO

// Mark notification as read
PUT /api/merchant-notifications/:id/read
  Request: { id: string }
  Response: { data: MerchantNotification }
  Breaking change: NO

// Mark all as read
PUT /api/merchant-notifications/merchant/:merchantId/read-all
  Request: { merchantId: string }
  Response: { data: { count: number } }
  Breaking change: NO
```

### Key Components/Functions
```typescript
NotificationEventHandler
  Location: apps/api/src/notifications/handlers/notification-event.handler.ts
  Purpose: Listens to booking domain events and creates notifications
  Used by: Event system (automatic subscription)

NotificationsContext
  Location: apps/merchant-app/src/contexts/notifications-context.tsx
  Purpose: Manages notification state, browser permissions, and sound playback
  Used by: All merchant app components needing notification access

useNotifications
  Location: apps/merchant-app/src/lib/query/hooks/use-notifications.ts
  Purpose: React Query hooks for fetching and mutating notifications
  Used by: NotificationsContext and notification UI components
```

## 🔗 Integration Points

### Upstream Dependencies
- [ ] Booking Services - Events trigger notification creation
- [ ] Outbox Publisher - Ensures reliable event delivery
- [ ] Browser Notifications API - For desktop notifications
- [ ] Audio API - For sound notifications

### Downstream Impact
- [ ] Merchant Dashboard - Shows notification badges and lists
- [ ] Calendar View - May trigger notifications on booking changes
- [ ] Booking Details - Links from notification action URLs

### Critical Paths
1. New booking created → Event published → Notification created → Frontend polls → Shows notification
2. User clicks browser notification → Window focuses → Navigates to booking details
3. Merchant marks notification as read → Updates UI state → Persists to database

## 🧪 Testing

### Automated Tests
```bash
# Currently no automated tests - manual testing required
# TODO: Add unit tests for notification services
# TODO: Add integration tests for event handling
# TODO: Add E2E tests for notification flow
```

### Manual Testing Checklist
- [ ] Create a new booking from merchant app - verify "New Booking" notification appears within 5 seconds
- [ ] Create a new booking from public booking app - verify "New Booking" notification appears within 5 seconds
- [ ] Cancel a booking - verify "Booking Cancelled" urgent notification appears
- [ ] Modify a booking - verify "Booking Modified" notification appears
- [ ] Complete a booking - verify "Booking Completed" notification appears
- [ ] Test browser notification permission flow
- [ ] Verify notification sound plays (volume at 30%)
- [ ] Click browser notification - verify navigation to correct booking
- [ ] Mark individual notification as read
- [ ] Mark all notifications as read
- [ ] Test with multiple browser tabs open
- [ ] Test notification persistence after page reload
- [ ] **NOTE**: All notifications currently require clicking bell icon or page refresh to appear

## ⚠️ Edge Cases & Gotchas

### Handled Edge Cases
- ✅ Duplicate browser notifications - Uses booking ID as tag for deduplication
- ✅ Sound autoplay restrictions - Errors caught silently
- ✅ Browser notification permissions - Graceful degradation if denied
- ✅ Multiple tabs polling - Each tab polls independently
- ✅ Stale data prevention - Aggressive cache invalidation
- ✅ Duplicate database records - Atomic processing prevents multiple event handling
- ✅ localStorage growth - Automatically cleaned up (keeps last 100 IDs)

### Known Limitations
- ⚠️ 5-second delay - Not real-time, uses polling instead of WebSockets
- ⚠️ Performance impact - Continuous polling creates backend load
- ⚠️ No notification batching - Each event creates separate notification
- ⚠️ No pagination - Frontend fetches up to 50 notifications
- ⚠️ Outbox query performance - Improved with index but still needs monitoring
- ⚠️ CRITICAL: Notifications don't appear until page refresh - React Query data updates aren't triggering notification processing

### Performance Notes
- Polling interval: 5 seconds (matches backend outbox polling)
- Cache strategy: No caching (staleTime: 0) to ensure fresh data
- Browser notifications auto-close after 5 seconds
- Sound file should be optimized and cached by browser

## 🐛 Debugging Guide

### Common Issues

**Issue**: Notifications not appearing until page refresh
- Check: Browser console for `[useNotifications] Fetching notifications...` logs every 5 seconds
- Check: Network tab for polling requests every 5 seconds returning new data
- Check: Console for `[NotificationsContext] Processing notifications` logs
- Check: `pm2 logs api --nostream --lines 50` for notification creation
- Root cause: React Query's `dataUpdatedAt` not triggering notification processing despite new data
- Attempted fixes:
  - Added `structuralSharing: false` to force new object references
  - Added effect to watch `dataUpdatedAt` changes
  - Added immediate processing when data updates
  - Problem persists - notifications fetch but don't process until component re-render

**Issue**: Browser notifications not showing
- Check: Browser notification permissions
- Check: Browser settings for site notifications
- Check: localStorage for `shownNotifications` entries
- Fix: Reset permissions and clear localStorage

**Issue**: Sound not playing
- Check: Browser autoplay policies
- Check: `/notification.mp3` file exists in public folder
- Check: Console for audio playback errors
- Fix: User interaction required before first sound

### Debug Commands
```bash
# Check API logs for notification events
pm2 logs api --nostream --lines 50 | grep -i notification

# Check outbox processing
pm2 logs api --nostream --lines 50 | grep -i outbox

# Monitor slow queries (outbox polling)
pm2 logs api --nostream --lines 50 | grep "Slow query"
```

### Key Log Entries
```
[NotificationEventHandler] Creating notification for booking
[OutboxPublisher] Publishing X events
[MerchantNotifications] Created notification type: booking_new
```

## 🔄 Maintenance Notes

### Safe to Modify
- ✅ Notification message templates and titles
- ✅ Notification priorities and types
- ✅ Browser notification duration (currently 5 seconds)
- ✅ Sound volume (currently 30%)

### Modify with Caution
- ⚠️ Polling interval - Affects server load and notification delay
- ⚠️ Event handler logic - Ensure all booking states covered
- ⚠️ Cache invalidation strategy - May cause data inconsistencies

### Do NOT Modify Without Full Understanding
- ❌ Outbox pattern implementation - Critical for reliability
- ❌ Event publishing in booking services - May break notification flow
- ❌ localStorage notification tracking - Prevents duplicate browser alerts

## 📊 Monitoring

### Metrics to Track
- Notification delivery time - Should be < 10 seconds from event
- Polling request rate - Should match expected merchant count
- Unread notification count - Indicates merchant engagement
- Browser notification permission rate - User adoption metric

### Alerts to Configure
- Outbox table size > 1000 - Indicates processing issues
- Notification creation failures - Critical for merchant awareness
- Polling endpoint response time > 1s - Performance degradation

## 🔗 Related Documentation

- [Booking System Documentation](./bookings.md)
- [Event-Driven Architecture](../architecture/events.md)
- [Frontend State Management](../frontend/state-management.md)

## 📝 Additional Notes

- WebSocket implementation was removed in favor of polling for simplicity
- The 5-second polling interval was chosen to balance responsiveness with server load
- Browser notification behavior varies significantly across browsers and OS
- Future optimization: Consider implementing notification batching for high-volume merchants
- The outbox pattern ensures notifications are never lost, even during service disruptions

### Email/SMS Implementation Status (2025-07-09)
- **Complete Implementation**: All services, templates, and providers are coded
- **Event Integration**: NotificationEventHandler calls email/SMS for all booking events
- **Dependencies Installed**: SendGrid and Twilio packages installed successfully
- **Configuration Required**:
  ```
  SENDGRID_API_KEY=your-key
  SENDGRID_FROM_EMAIL=noreply@yourdomain.com
  TWILIO_ACCOUNT_SID=your-sid
  TWILIO_AUTH_TOKEN=your-token
  TWILIO_PHONE_NUMBER=+1234567890  # Must be a real Twilio number
  ```
- **Fixed Issues**: 
  - SendGrid TypeScript import resolved (changed to CommonJS require)
  - Provider factories updated to use proper dependency injection
  - Both services initializing successfully as seen in logs
- **To Activate**: Update Twilio phone number from placeholder to actual Twilio number

### Recent Fixes (2025-01-01)
- Fixed race condition where all notifications were marked as "seen" preventing browser alerts
- Added atomic processing to outbox events to prevent duplicate handling
- Improved notification state tracking - only processed notifications are tracked
- Added debouncing (100ms) to prevent rapid state updates
- Browser notifications now use booking ID as tag for better deduplication
- Added localStorage cleanup to prevent unbounded growth

### Updates (2025-01-03)
- Added missing `booking.rescheduled` event handler in NotificationEventHandler
- Created database index for OutboxEvent queries: `CREATE INDEX "OutboxEvent_processedAt_retryCount_idx"`
- Simplified notification messages to avoid time formatting issues
- Attempted to fix auto-notification by processing on React Query data updates

### Updates (2025-07-03)
- Fixed missing notifications for bookings created through public booking app
  - Added OutboxEvent creation in PublicBookingService
  - Now triggers same notification flow as merchant-created bookings
- Notifications confirmed working from booking app to merchant app
- Auto-popup issue remains unresolved for all notification sources

### Updates (2025-07-09)
- Implemented optimistic updates for immediate UI feedback
  - Added optimistic notifications state in NotificationsContext
  - SSE and Supabase handlers now update UI immediately without waiting for API
  - Notifications merge optimistic state with API data to prevent duplicates
- Fixed EventEmitter2 missing in MerchantNotificationsService
  - Backend wasn't emitting events after creating notifications
  - Added EventEmitter2 injection and 'notification.created' event emission
- Added Supabase environment variables to merchant app
- Migration to Supabase Realtime attempted but incomplete:
  - Feature flag system implemented for gradual rollout
  - Supabase client initialization code added
  - SQL migration for Realtime not yet applied to database
  - SSE remains primary notification method

### Critical Unresolved Issues
- **SSE Performance Issues**:
  - SSE notifications are slow (several seconds delay)
  - SSE doesn't force calendar refresh reliably
  - Console shows SSE events received but UI updates are inconsistent
  
- **Supabase Realtime Not Working**:
  - Configuration is in place but Realtime not functioning
  - Missing SQL migration for Realtime subscriptions
  - No console logs showing Supabase connection attempts
  - Feature flag currently disabled by default

- **Calendar Auto-Refresh Issues**:
  - Calendar doesn't update automatically with new bookings
  - Manual refresh required to see new bookings
  - bookingEvents.broadcast() called but calendar hooks not always responding

### Current State Summary
- **Working**: Basic notification creation and display after manual refresh
- **Partially Working**: SSE events received but slow and unreliable UI updates
- **Not Working**: Supabase Realtime, automatic calendar refresh, instant notification popups
- **Email/SMS Status**: 
  - Infrastructure fully implemented (services, templates, providers)
  - SendGrid and Twilio packages installed (2025-07-09)
  - Credentials configured in .env
  - Both Twilio SMS and SendGrid email services initializing successfully
  - SendGrid TypeScript import issue resolved (using CommonJS require)
  - Provider factories updated to use dependency injection
  - Ready for testing but requires updating Twilio phone number from placeholder (+1234567890)
  
### Technical Insights Discovered
1. **OutboxEvent Performance**: Queries were slow (400-500ms) due to missing index on `processedAt` and `retryCount`
2. **Event Handler Coverage**: The system was missing handlers for some booking events (e.g., rescheduled)
3. **React Query Behavior**: Setting `structuralSharing: false` doesn't guarantee effect triggers
4. **Notification Deduplication**: Using booking ID as browser notification tag prevents duplicate popups
5. **PM2 Logging**: Always use `--nostream` flag to avoid hanging when reading logs

### Debugging Shortcuts
```bash
# Quick notification system check
pm2 logs api --nostream --lines 20 | grep -E "(notification|Notification|NOTIFICATION)"

# Monitor OutboxEvent processing
pm2 logs api --nostream --lines 20 | grep -E "(OutboxPublisher|Slow query)"

# Check if notifications are being created
pm2 logs api --nostream --lines 20 | grep "Creating notification for"
```

---

**Last Updated**: 2025-07-03  
**Next Review Date**: 2025-10-03

<!-- 
Template Usage Notes:
- Fill in all sections, even if briefly
- Use specific examples rather than vague descriptions
- Include actual commands and code snippets
- Focus on the "why" not just the "what"
- Update this doc when bugs are found or changes made
-->