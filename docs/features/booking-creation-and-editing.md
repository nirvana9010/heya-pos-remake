# Merchant Booking Management Features

## Overview

The merchant booking system provides comprehensive functionality for creating, managing, and tracking customer bookings. The system supports multiple entry points for booking creation, detailed booking management, and real-time status updates.

## Architecture

### Key Components

1. **BookingSlideOut** (`/components/BookingSlideOut.tsx`)
   - Multi-step booking creation wizard
   - Staff availability checking
   - Walk-in customer support
   - Service and staff selection

2. **BookingDetailsSlideOut** (`/components/BookingDetailsSlideOut.tsx`)
   - View and edit booking details
   - Status management
   - Payment tracking
   - Quick actions

3. **BookingActions** (`/components/BookingActions.tsx`)
   - Reusable component for booking actions
   - Status transitions
   - Payment processing
   - Communication features

4. **BookingContext** (`/contexts/booking-context.tsx`)
   - Global booking slideout management
   - Data loading and caching
   - Quick booking access

## Booking Creation

### Entry Points

1. **Quick Booking Button** (Top Navigation Bar)
   - Accessible from anywhere in the app
   - Opens BookingSlideOut with current date/time
   - Managed by BookingContext

2. **Calendar View**
   - Click on empty time slots
   - Pre-fills selected time and staff
   - Visual availability checking

3. **Bookings Page**
   - "Quick Booking" button
   - Batch booking capabilities
   - Context-aware creation

### Creation Process

The booking creation follows a 4-step wizard:

#### Step 1: Date & Time
- Staff member selection with availability checking
- "Next Available" smart assignment
- Date and time selection
- Real-time availability updates
- Notes field for special requests

#### Step 2: Service Selection
- Service catalog with pricing
- Duration display
- Category organization
- Multi-service support (for bookings with multiple services)

#### Step 3: Customer Selection
- Customer search with autocomplete
- New customer creation inline
- Walk-in customer support (if enabled)
- Contact information capture

#### Step 4: Confirmation
- Booking summary
- Total price calculation
- Reminder settings
- Final confirmation

### Walk-in Customers

When merchant settings allow (`allowWalkInBookings`):
- Generate walk-in customer with timestamp
- Format: "Walk-in MMM-DD-HH:MM[AM/PM]"
- No phone number or email required
- Customer source marked as 'WALK_IN'

### Staff Assignment

1. **Next Available Staff**
   - Intelligent staff assignment based on availability
   - Shows assigned staff before confirmation
   - Falls back to first available staff

2. **Specific Staff Selection**
   - Direct staff assignment
   - Availability indicators
   - Unavailable staff shown but disabled

3. **Unassigned Bookings**
   - Optional based on merchant settings
   - `allowUnassignedBookings` configuration

## Booking Management

### Viewing Bookings

#### Bookings List Page
- Grouped by date (Today, Tomorrow, This Week, etc.)
- Real-time status indicators
- Progress bars for in-progress bookings
- Payment status badges
- Quick actions inline

#### Booking Details
- Customer information
- Service details with pricing
- Staff assignment
- Date and time
- Payment status
- Notes and special requests

### Editing Bookings

#### Quick Edit (BookingDetailsSlideOut)
- Staff reassignment
- Time/date changes
- Notes updates
- Inline editing mode

#### Full Edit Page (`/bookings/[id]/edit`)
- Service changes
- Complete rescheduling
- Comprehensive form
- Validation and conflict checking

### Status Management

#### Status Transitions

1. **Pending → Confirmed**
   - Manual confirmation required
   - Sends confirmation notification

2. **Confirmed → In Progress**
   - "Start" action
   - Progress tracking begins
   - Real-time progress bar

3. **In Progress → Completed**
   - "Complete" action
   - Finalizes booking
   - Updates payment status

4. **Any Status → Cancelled**
   - Cancellation with reason
   - Notification sent
   - Frees up time slot

5. **Confirmed → No Show**
   - Mark customer as no-show
   - Tracking for repeat offenders

### Payment Integration

#### Payment Status Tracking
- Visual indicators (green checkmark for paid)
- Integration with POS system
- Quick payment marking

#### Payment Actions
1. **Mark as Paid**
   - Quick cash payment recording
   - Creates order if needed
   - Updates booking status

2. **Process Payment**
   - Opens payment dialog
   - Multiple payment methods
   - Tip support (if enabled)

## Calendar Integration

### Calendar View Features
- Day and week views
- Staff columns with availability
- Drag-and-drop rescheduling (planned)
- Visual booking blocks
- Real-time updates

### Creating from Calendar
- Click empty slots to create bookings
- Pre-filled time and staff
- Context-aware availability
- Quick creation flow

## Communication Features

### Customer Reminders
- SMS reminders (via integrated service)
- Email reminders
- Bulk reminder sending
- Customizable timing

### Notification System
- Real-time updates via notifications
- Status change alerts
- Payment confirmations
- Cancellation notices

## Bulk Operations

### Selection System
- Individual booking selection
- Select all in group
- Bulk actions menu

### Available Bulk Actions
1. **Send Reminders**
   - Multiple bookings at once
   - Progress tracking
   - Success/failure reporting

2. **Export**
   - CSV format
   - Customizable fields
   - Date range filtering

## Search and Filtering

### Search Capabilities
- Customer name
- Service name
- Phone number
- Booking ID
- Staff name

### Filters
1. **Status Filter**
   - All statuses
   - Individual status selection
   - Multiple status support

2. **Date Filters**
   - Upcoming (default)
   - All dates
   - Past only
   - Custom date range

3. **Staff Filter**
   - All staff
   - Individual staff member
   - Active/inactive

4. **Payment Filter**
   - All payments
   - Paid only
   - Unpaid only

### Recent Searches
- Automatic saving
- Quick access dropdown
- Clear history option
- Last 5 searches preserved

## API Integration

### Booking API Endpoints

```typescript
// Create booking
POST /api/v2/bookings
{
  customerId: string,
  locationId: string,
  services: [{
    serviceId: string,
    staffId?: string
  }],
  staffId?: string,
  startTime: string,
  notes?: string
}

// Update booking
PATCH /api/v2/bookings/:id
{
  startTime?: string,
  staffId?: string,
  status?: string,
  notes?: string
}

// Status updates
PATCH /api/v2/bookings/:id/start
PATCH /api/v2/bookings/:id/complete
PATCH /api/v2/bookings/:id/cancel

// Payment
POST /api/v2/bookings/:id/mark-paid
```

### Data Transformation
- V1/V2 API compatibility
- Automatic field mapping
- Status normalization
- Date/time handling

## Configuration

### Merchant Settings
```typescript
{
  allowWalkInBookings: boolean,      // Enable walk-in customers
  allowUnassignedBookings: boolean,  // Allow bookings without staff
  enableTips: boolean,               // Tip support in payments
  defaultTipPercentages: number[]    // Tip percentage options
}
```

### Availability Rules
- Business hours checking
- Staff schedule integration
- Break time handling
- Concurrent booking limits

## Performance Optimizations

### Loading States
- Skeleton screens
- Progressive loading
- Cached data usage
- Optimistic updates

### Real-time Updates
- WebSocket support (when available)
- Polling fallback
- Conflict resolution
- Update indicators

## Error Handling

### Validation
- Time slot conflicts
- Staff availability
- Service compatibility
- Customer data validation

### User Feedback
- Toast notifications
- Inline error messages
- Loading indicators
- Success confirmations

## Future Enhancements

1. **Recurring Bookings**
   - Weekly/monthly patterns
   - Series management
   - Exception handling

2. **Advanced Scheduling**
   - Buffer time settings
   - Travel time between locations
   - Resource allocation

3. **Customer Portal Integration**
   - Self-service rescheduling
   - Cancellation requests
   - Booking history

4. **Analytics**
   - Booking patterns
   - No-show tracking
   - Revenue analysis
   - Staff utilization

## Best Practices

1. **Always check availability** before confirming bookings
2. **Use walk-in customers** for quick bookings without customer details
3. **Set appropriate status** to track booking lifecycle
4. **Send reminders** to reduce no-shows
5. **Keep notes updated** for special requirements
6. **Process payments promptly** to maintain cash flow
7. **Use bulk operations** for efficiency with multiple bookings