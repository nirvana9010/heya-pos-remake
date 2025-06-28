# Calendar Auto-Refresh Implementation

## Overview
The calendar now automatically updates when bookings are created from external sources (booking app, API, etc.) without requiring manual refresh.

## Implementation Details

### 1. **Broadcast Channel API**
Uses the native BroadcastChannel API for cross-tab/window communication:

```typescript
// Broadcasting (from booking app)
const channel = new BroadcastChannel('heya-pos-bookings');
channel.postMessage({
  type: 'booking_created',
  bookingId: booking.id,
  source: 'external',
  timestamp: Date.now()
});

// Listening (in calendar)
bookingEvents.subscribe((event) => {
  if (event.type === 'booking_created' && event.source === 'external') {
    // Refresh calendar after 1 second delay
    setTimeout(() => fetchBookings(), 1000);
  }
});
```

### 2. **Focus-Based Refresh**
Refreshes when the calendar tab regains focus:
- Triggered when user switches back to calendar tab
- Minimum 30-second interval between refreshes
- Prevents excessive API calls

### 3. **Performance Considerations**
- No constant polling - event-driven updates only
- Debounced refresh with minimum intervals
- Only refreshes when not already loading
- Small delay (1 second) ensures database consistency

## How It Works

1. **Booking Created in Booking App**:
   - Booking is saved to database
   - Broadcast event is sent to all tabs
   - Event includes booking ID and source

2. **Calendar Receives Event**:
   - Listens for booking events
   - Filters for external sources only
   - Waits 1 second for DB propagation
   - Fetches updated bookings

3. **Focus-Based Backup**:
   - If broadcast fails or browser doesn't support it
   - Calendar refreshes when tab becomes visible
   - 30-second minimum between refreshes

## Browser Support
- BroadcastChannel API: Chrome 54+, Firefox 38+, Safari 15.4+
- Fallback: Focus/visibility events work in all browsers

## Testing

### 1. **Visual Test**
Open `test-broadcast-events.html` in browser to see events in real-time.

### 2. **End-to-End Test**
1. Open merchant calendar in one tab
2. Open booking test page in another tab
3. Create a booking
4. Watch calendar update automatically (within 1-2 seconds)

### 3. **Cross-Browser Test**
Test in multiple browsers to ensure compatibility:
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Requires version 15.4+

## Troubleshooting

### Calendar Not Updating
1. Check browser console for errors
2. Verify BroadcastChannel support: `'BroadcastChannel' in window`
3. Ensure tabs are same origin (same domain/port)
4. Check if focus-based refresh works (switch tabs)

### Duplicate Bookings
- Fixed by cleaning up test data
- Each booking has unique ID
- Calendar deduplicates by ID

## Future Enhancements
1. WebSocket support for real-time updates
2. Server-sent events for push notifications
3. Optimistic UI updates
4. Differential sync (only fetch changes)