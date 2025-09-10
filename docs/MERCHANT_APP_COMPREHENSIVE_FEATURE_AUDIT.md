# Heya POS Merchant App - Comprehensive Feature Audit
*Complete documentation of every feature, button, input, and capability*

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Authentication & Access Control](#authentication--access-control)
3. [Dashboard Features](#dashboard-features)
4. [Booking Management](#booking-management)
5. [Calendar System](#calendar-system)
6. [Customer Management](#customer-management)
7. [Staff Management](#staff-management)
8. [Service Management](#service-management)
9. [Payment & POS System](#payment--pos-system)
10. [Reports & Analytics](#reports--analytics)
11. [Settings & Configuration](#settings--configuration)
12. [Notifications System](#notifications-system)
13. [Special Features](#special-features)
14. [Developer & Debug Tools](#developer--debug-tools)
15. [UI Components & Interactions](#ui-components--interactions)

---

## System Architecture

### Core Technology Stack
- **Framework**: Next.js 14 with App Router
- **UI Library**: Custom `@heya-pos/ui` design system
- **State Management**: React Query (TanStack Query) + Context API
- **Authentication**: JWT-based with automatic refresh tokens
- **Real-time Updates**: Polling-based (60-second intervals)
- **Database**: PostgreSQL via Prisma ORM
- **Deployment**: Fly.io (API + Database co-located in Sydney)

### Performance Optimizations
- **Prefetch Manager**: Proactive data loading
- **Memory Cache**: In-memory caching with TTL
- **Optimistic Updates**: Immediate UI feedback
- **Code Splitting**: Dynamic imports for faster loads
- **Service Worker**: Offline support and caching

---

## Authentication & Access Control

### Login System (`/login`)
- **Email/Password Authentication**
  - Email input field with validation
  - Password input with show/hide toggle
  - Remember me checkbox (stores preference)
  - "Forgot Password" link (placeholder)
  - Loading states during authentication
  - Error messages for invalid credentials

### Session Management
- **JWT Token System**
  - Access token (15-minute expiry)
  - Refresh token (7-day expiry)
  - Automatic token refresh (proactive + reactive)
  - Token storage in localStorage
  - Secure logout with token cleanup

### Role-Based Access Control
- **Three Access Levels**:
  1. **Employee (Level 1)**: Basic booking and customer operations
  2. **Manager (Level 2)**: Reports, staff management, advanced features
  3. **Owner (Level 3)**: Full system access, settings, security configuration

### PIN Protection System
- **PIN-Protected Operations**:
  - Refunds processing
  - Booking cancellations
  - Report access
  - Staff creation/deletion
  - Settings modifications
- **PIN Input Dialog**: Numeric keypad with masked input
- **Owner PIN Setup**: First-time configuration flow

---

## Dashboard Features

### Main Dashboard (`/dashboard`)

#### Quick Stats Cards
- **Today's Bookings**
  - Current count display
  - Percentage change from yesterday
  - Trend indicator (up/down arrow)
  - Color-coded performance (green/red)
  
- **Today's Revenue**
  - Dollar amount display
  - Percentage change from yesterday
  - Currency formatting
  - Trend visualization
  
- **New Customers**
  - Count of new registrations
  - Growth percentage
  - Historical comparison
  
- **Pending Bookings**
  - Count of unconfirmed bookings
  - Orange warning indicator
  - Click to view pending list

#### Quick Actions Panel
- **New Booking Button**: Opens booking creation flow
- **View Calendar Button**: Navigate to calendar view
- **Customers Button**: Access customer database
- **Reports Button**: Open analytics dashboard

#### Today's Schedule Section
- **Booking List Display**:
  - Customer avatar with initials
  - Customer name (clickable)
  - Service name
  - Appointment time
  - Staff member assigned
  - Status badge (color-coded)
  - Click any booking to view details

- **Empty State**: "No bookings scheduled for today" message
- **Error State**: Graceful handling with retry option
- **Loading State**: Skeleton placeholders

---

## Booking Management

### Bookings List Page (`/bookings`)

#### Search & Filter Bar
- **Search Input**:
  - Search by customer name
  - Search by phone number
  - Search by booking ID
  - Search by service name
  - Recent searches dropdown (last 5)
  - Clear search button

#### Filter Controls
- **Status Filter Dropdown**:
  - All statuses
  - Confirmed
  - Pending
  - In Progress
  - Completed
  - Cancelled
  - No Show

- **Staff Filter Dropdown**:
  - All staff
  - Individual staff members
  - Unassigned bookings

- **Payment Status Toggle**:
  - All payments
  - Paid only
  - Unpaid only

- **Date Range Selector**:
  - Upcoming bookings
  - All dates
  - Past bookings only
  - Custom date range picker

#### Booking Statistics Dashboard
- **Today's Stats**:
  - Total bookings count
  - Completed count
  - In-progress indicator
  - Next available slot

- **Upcoming Stats**:
  - Next 2 hours count
  - Pending confirmations
  - Average wait time

#### Booking Actions
- **Bulk Operations** (when multiple selected):
  - Select all checkbox
  - Send bulk reminders
  - Export selected to CSV
  - Bulk status update

- **Individual Booking Actions**:
  - **Check In Button**: Mark customer as arrived
  - **Start Button**: Begin service (opens edit if blank booking)
  - **Complete Button**: Mark as finished
  - **Cancel Button**: Cancel with reason
  - **Edit Button**: Open booking editor
  - **Payment Button**: Process payment
  - **More Menu** (3 dots):
    - Send reminder
    - Duplicate booking
    - View history
    - Print receipt

#### Booking Display
- **Booking Card Information**:
  - Time slot display
  - Customer name and phone
  - Service name and duration
  - Staff member assigned
  - Payment status badge
  - Booking status badge
  - Progress bar (for in-progress)
  - Time alerts (starting soon)

### New Booking Page (`/bookings/new`)
- **Customer Selection**:
  - Search existing customers
  - Create new customer inline
  - Recent customers list

- **Service Selection**:
  - Category-based service list
  - Multi-service selection
  - Duration calculation
  - Price display

- **Date & Time Selection**:
  - Calendar date picker
  - Available time slots
  - Staff availability check

- **Staff Assignment**:
  - Available staff list
  - Auto-assignment option
  - Staff preference setting

### Booking Details SlideOut
- **Header Section**:
  - Booking ID display
  - Status badge
  - Close button

- **Customer Information**:
  - Name and contact
  - Loyalty points
  - Visit history link

- **Service Details**:
  - Service list with prices
  - Add/remove services
  - Duration adjustment
  - Discount application

- **Scheduling**:
  - Date/time modification
  - Staff reassignment
  - Availability check

- **Payment Section**:
  - Payment status
  - Process payment button
  - Payment method selection
  - Receipt generation

- **Actions Panel**:
  - Save changes
  - Cancel booking
  - Send reminder
  - Print receipt

---

## Calendar System

### Calendar Page (`/calendar`)

#### View Controls
- **View Toggle Buttons**:
  - Day view
  - Week view
  - Month view

- **Navigation**:
  - Previous/Next buttons
  - Today button
  - Date picker dropdown

- **Display Settings**:
  - Show/hide roster filter
  - Show/hide unassigned column
  - Time grid start/end adjustment

#### Calendar Grid
- **Staff Columns**:
  - Individual column per staff member
  - Staff name header
  - Working hours indicator
  - Break time blocks

- **Time Slots**:
  - 15-minute increments
  - Configurable start/end hours
  - Current time indicator line

- **Booking Display**:
  - Color-coded by staff
  - Customer name
  - Service abbreviation
  - Duration visualization
  - Status indicator

#### Drag & Drop Features
- **Booking Manipulation**:
  - Drag to reschedule
  - Resize to adjust duration
  - Drop zones highlighted
  - Conflict detection
  - Undo/redo support

- **Visual Feedback**:
  - Dragging overlay
  - Valid drop zones
  - Invalid drop indication
  - Ghost preview

#### Booking Interactions
- **Click Actions**:
  - Single click: View details
  - Double click: Edit booking
  - Right click: Context menu

- **Context Menu Options**:
  - Edit booking
  - Change status
  - Process payment
  - Cancel booking
  - Send reminder

---

## Customer Management

### Customers List Page (`/customers`)

#### Search & Management
- **Search Bar**:
  - Name search
  - Email search
  - Phone search
  - Advanced filters

- **Add Customer Button**: Opens creation form

#### Customer Table
- **Column Headers** (sortable):
  - Customer name
  - Email address
  - Phone number
  - Total visits
  - Total spent
  - Last visit date
  - Loyalty points

- **Row Actions**:
  - View profile
  - Edit details
  - Book appointment
  - View history
  - Delete customer

### Customer Profile Page (`/customers/[id]`)

#### Profile Header
- **Customer Avatar**: Initials or photo
- **Basic Information**:
  - Full name
  - Email address
  - Phone numbers
  - Address
  - Join date

- **Quick Actions**:
  - Book appointment
  - Send message
  - Edit profile

#### Customer Statistics
- **Visit Metrics**:
  - Total visits
  - Frequency chart
  - No-show rate
  - Cancellation rate

- **Financial Metrics**:
  - Total spent
  - Average transaction
  - Payment methods used
  - Outstanding balance

- **Loyalty Information**:
  - Current points
  - Points history
  - Redemption history
  - Tier status

#### Booking History Tab
- **Historical Bookings List**:
  - Date and time
  - Service received
  - Staff member
  - Amount paid
  - Status
  - View details link

- **Filters**:
  - Date range
  - Service type
  - Staff member
  - Status

#### Notes & Tags Tab
- **Customer Notes**:
  - Add note button
  - Note history
  - Staff attribution
  - Timestamp

- **Customer Tags**:
  - Add/remove tags
  - Predefined tags
  - Custom tags
  - Tag filtering

#### Preferences Tab
- **Communication Preferences**:
  - Email notifications toggle
  - SMS notifications toggle
  - Marketing consent
  - Preferred contact method

- **Service Preferences**:
  - Favorite services
  - Preferred staff
  - Allergies/conditions
  - Special requirements

### Customer Creation/Edit Form
- **Personal Information**:
  - First name (required)
  - Last name (required)
  - Email (required, validated)
  - Mobile number
  - Home phone
  - Date of birth

- **Address Information**:
  - Street address
  - City
  - State/Province
  - Postal code
  - Country

- **Additional Information**:
  - Tags selection
  - Initial notes
  - Marketing consent
  - Loyalty enrollment

---

## Staff Management

### Staff List Page (`/staff`)

#### Staff Overview
- **Add Staff Button**: Opens creation form
- **Active/Inactive Toggle**: Filter by status

#### Staff Table
- **Columns**:
  - Staff name
  - Role (Employee/Manager/Owner)
  - Email
  - Phone
  - Status (Active/Inactive)
  - Schedule
  - Actions

- **Row Actions**:
  - Edit profile
  - View schedule
  - Set PIN
  - Deactivate/Activate
  - Delete (with confirmation)

### Staff Profile Management
- **Basic Information**:
  - Full name
  - Email address
  - Phone number
  - Emergency contact

- **Employment Details**:
  - Role assignment
  - Hire date
  - Employee ID
  - Department

- **Security Settings**:
  - PIN setup/reset
  - Access level
  - Permissions

### Staff Schedule Management
- **Weekly Schedule**:
  - Monday-Sunday grid
  - Start/end times per day
  - Break times
  - Days off

- **Schedule Actions**:
  - Copy week
  - Clear schedule
  - Apply template

---

## Service Management

### Services List Page (`/services`)

#### Service Catalog
- **Add Service Button**: Opens creation form
- **Import Services Button**: CSV upload
- **Category Filter**: Filter by category

#### Services Table
- **Columns**:
  - Service name
  - Category
  - Duration
  - Price
  - Tax rate
  - Deposit amount
  - Status
  - Actions

- **Row Actions**:
  - Edit service
  - Duplicate
  - Toggle active/inactive
  - Delete

### Service Creation/Edit Form
- **Basic Information**:
  - Service name (required)
  - Category selection/creation
  - Description

- **Pricing & Duration**:
  - Price (required)
  - Duration in minutes
  - Tax rate percentage
  - Deposit amount
  - Deposit percentage

- **Advanced Settings**:
  - Buffer time before/after
  - Multi-staff requirement
  - Equipment needed
  - Online booking availability

### Service Import Feature
- **CSV Upload**:
  - Download template button
  - File selection
  - Drag & drop support

- **Column Mapping Dialog**:
  - Auto-detection
  - Manual mapping
  - Preview first 5 rows

- **Import Options**:
  - Skip duplicates
  - Update existing
  - Category auto-creation

---

## Payment & POS System

### Quick Sale SlideOut
- **Customer Selection**:
  - Search bar
  - Recent customers
  - Walk-in option

- **Service Selection**:
  - Category tabs
  - Service list
  - Custom amount input
  - Multi-select support

- **Cart Management**:
  - Service list with prices
  - Quantity adjustment
  - Discount application
  - Tax calculation
  - Total display

- **Payment Processing**:
  - Payment method selection
  - Card terminal integration
  - Cash handling
  - Split payment option

### Payment Dialog
- **Payment Methods**:
  - Cash button
  - Card button
  - EFTPOS button
  - Other methods

- **Tyro Integration**:
  - Terminal selection
  - Amount display
  - Process payment button
  - Status indicators

- **Cash Handling**:
  - Amount tendered input
  - Change calculation
  - Quick amount buttons

- **Receipt Options**:
  - Print receipt
  - Email receipt
  - No receipt

### Payment History (`/payments`)
- **Transaction List**:
  - Date/time
  - Customer name
  - Amount
  - Payment method
  - Status
  - Receipt link

- **Filters**:
  - Date range
  - Payment method
  - Staff member
  - Amount range

- **Actions**:
  - View details
  - Print receipt
  - Process refund (PIN required)

---

## Reports & Analytics

### Reports Dashboard (`/reports`)

#### View Modes
- **Executive Mode Toggle**: Simplified KPI view
- **Classic Mode Toggle**: Detailed analytics

#### Executive Dashboard Mode
- **Key Performance Indicators**:
  - Revenue (with trend)
  - Bookings (with trend)
  - New customers (with trend)
  - Average transaction value

- **Visual Charts**:
  - Revenue trend line
  - Booking volume bars
  - Service breakdown pie
  - Staff performance comparison

#### Classic Analytics Mode
- **Time Range Selector**:
  - Today
  - This week
  - This month
  - This year
  - Custom range

- **Revenue Analytics**:
  - Total revenue
  - Daily average
  - Payment method breakdown
  - Service revenue ranking

- **Booking Analytics**:
  - Total bookings
  - Completion rate
  - No-show rate
  - Average duration

- **Customer Analytics**:
  - New vs returning
  - Customer lifetime value
  - Retention rate
  - Top customers list

- **Staff Analytics**:
  - Revenue per staff
  - Utilization rate
  - Average service time
  - Customer satisfaction

#### Export Features
- **Export Button**: Download CSV
- **Export Options**:
  - Current view
  - All data
  - Custom selection

---

## Settings & Configuration

### Settings Page (`/settings`)

#### Business Tab
- **Business Information**:
  - Business name (read-only)
  - ABN/Tax ID (read-only)
  - Contact information (read-only)
  - "Edit in Profile" link

- **Location Settings**:
  - Timezone selector
  - Business hours grid:
    - Day checkboxes (open/closed)
    - Open time selector
    - Close time selector
    - Copy to all button

- **Customer URLs**:
  - Booking app URL display
  - Copy URL button
  - Open in new tab button
  - Check-in URL for tablets
  - QR code generation

#### Booking Tab
- **Booking Rules**:
  - Advance booking limit (24-168 hours dropdown)
  - Cancellation notice (12-72 hours dropdown)
  - Minimum notice (0-24 hours dropdown)
  - Buffer time between bookings

- **Calendar Display**:
  - Start hour selector (6 AM - 12 PM)
  - End hour selector (5 PM - 11 PM)
  - Time slot duration (15/30/60 min)
  - Show unassigned column toggle
  - Show roster filter toggle

- **Booking Behavior**:
  - Auto-confirm bookings toggle
  - Allow unassigned bookings toggle
  - Require deposit toggle
  - Online booking toggle

#### Security Tab
- **PIN Requirements**:
  - Refunds checkbox
  - Cancellations checkbox
  - Reports access checkbox
  - Staff management checkbox
  - Settings changes checkbox

- **Access Level Configuration**:
  - Employee permissions list
  - Manager permissions list
  - Owner permissions list

- **Session Settings**:
  - Auto-logout timeout
  - Remember me duration
  - Multi-device login toggle

#### Notifications Tab
- **Customer Notifications**:
  - Booking confirmation email toggle
  - 24-hour reminder email toggle
  - 2-hour reminder email toggle
  - SMS reminders (coming soon)
  - Cancellation notices toggle

- **Staff Notifications**:
  - New booking alert toggle
  - Cancellation alert toggle
  - Customer arrival toggle
  - Daily summary email toggle

- **Notification Channels**:
  - In-app notifications toggle
  - Email notifications toggle
  - Push notifications (coming soon)

#### Import Tab
- **Customer Import Section**:
  - Download template button
  - Upload CSV button
  - Field mapping table:
    - Name mapping
    - Email mapping
    - Mobile mapping
    - Address mapping
    - Notes mapping
    - Tags mapping
    - Loyalty points mapping

- **Service Import Section**:
  - Download template button
  - Upload CSV button
  - Column mapping interface
  - Preview before import
  - Duplicate handling options

- **Import History**:
  - Recent imports list
  - Status indicators
  - Rollback option

---

## Notifications System

### Notifications Dropdown
- **Notification Bell Icon**: 
  - Badge with unread count
  - Click to open dropdown

- **Dropdown Content**:
  - Unread notifications section
  - Read notifications section
  - Mark all as read button
  - View all link

- **Notification Types**:
  - New booking alerts
  - Cancellation notices
  - Payment confirmations
  - System messages

### Notifications Page (`/notifications`)
- **Notification List**:
  - Time grouping (Today, Yesterday, This Week)
  - Notification cards with:
    - Icon indicator
    - Title and message
    - Timestamp
    - Action buttons
    - Mark as read toggle

- **Filters**:
  - All notifications
  - Unread only
  - By type
  - Date range

- **Settings Link**: Navigate to notification preferences

---

## Special Features

### Check-ins Page (`/check-ins`)
- **Today's Arrivals Dashboard**:
  - Expected arrivals count
  - Checked-in count
  - No-show count
  - Late arrivals

- **Check-in List**:
  - Time slots
  - Customer name
  - Service
  - Staff member
  - Check-in button
  - Mark no-show button

### Loyalty System (`/loyalty`)
- **Program Overview**:
  - Active members count
  - Points issued today
  - Points redeemed today
  - Program statistics

- **Member Management**:
  - Member search
  - Points adjustment
  - Manual redemption
  - History viewing

### Roster Management (`/roster`)
- **Weekly Roster View**:
  - Staff rows
  - Day columns
  - Shift blocks
  - Total hours

- **Roster Actions**:
  - Add shift
  - Edit shift
  - Copy week
  - Publish roster

### Profile Page (`/profile`)
- **Business Profile**:
  - Business name edit
  - Contact information
  - Address details
  - Logo upload

- **User Profile**:
  - Personal information
  - Password change
  - Email preferences
  - Theme selection

---

## Developer & Debug Tools

### Debug Pages
- **Auth Debug** (`/debug-auth`):
  - Token display
  - User context
  - Refresh testing
  - Logout testing

- **WebSocket Test** (`/websocket-test`):
  - Connection status
  - Message testing
  - Event monitoring
  - Reconnection testing

- **Component Sampler** (`/sampler`):
  - UI component showcase
  - Theme testing
  - Responsive testing

### Test Pages
- **Slideout Test** (`/test/slideout-test`):
  - SlideOut component testing
  - Animation testing
  - Z-index verification

- **Notification Settings Test** (`/test/notification-settings`):
  - Settings UI testing
  - Toggle functionality
  - Save/load testing

---

## UI Components & Interactions

### Global Components
- **Top Loading Bar**: Page transition indicator
- **Error Boundaries**: Graceful error handling
- **Connection Status**: Online/offline indicator
- **Toast Notifications**: Success/error/info messages

### Interactive Elements
- **Buttons**:
  - Primary (blue)
  - Secondary (gray)
  - Danger (red)
  - Success (green)
  - Ghost (transparent)
  - Icon buttons
  - Loading states
  - Disabled states

- **Form Controls**:
  - Text inputs with validation
  - Textareas with character count
  - Select dropdowns
  - Multi-select
  - Checkboxes
  - Radio buttons
  - Toggle switches
  - Date pickers
  - Time pickers
  - File uploads

- **Data Display**:
  - Tables with sorting
  - Cards with actions
  - Lists with selection
  - Grids with responsive layout
  - Charts and graphs
  - Progress bars
  - Badges and pills
  - Tooltips
  - Popovers

### Navigation Components
- **Sidebar**:
  - Collapsible design
  - Icon + label display
  - Active state indication
  - Nested menu support
  - Badge notifications

- **Breadcrumbs**: Hierarchical navigation
- **Tabs**: Content organization
- **Pagination**: Data set navigation
- **Search**: Global and contextual

### Modals & Overlays
- **Standard Modals**:
  - Header, body, footer structure
  - Close button
  - Backdrop click to close
  - ESC key to close

- **SlideOut Panels**:
  - Right-side entry
  - Full height
  - Overlay backdrop
  - Smooth animations

- **Dialogs**:
  - Confirmation dialogs
  - Alert dialogs
  - Form dialogs
  - Custom content dialogs

### Feedback Mechanisms
- **Loading States**:
  - Spinners
  - Skeleton screens
  - Progress indicators
  - Shimmer effects

- **Empty States**:
  - Illustrative icons
  - Descriptive text
  - Action buttons

- **Error States**:
  - Error messages
  - Retry buttons
  - Help links

- **Success States**:
  - Confirmation messages
  - Completion animations
  - Next action prompts

---

## Keyboard Shortcuts

### Global Shortcuts
- `Ctrl/Cmd + K`: Open global search
- `Ctrl/Cmd + N`: New booking
- `Ctrl/Cmd + /`: Toggle sidebar
- `ESC`: Close modals/overlays

### Page-Specific Shortcuts
- **Calendar**: Arrow keys for navigation
- **Bookings**: Space to select, Enter to open
- **Forms**: Tab navigation, Enter to submit

---

## Performance Features

### Optimization Techniques
- **Code Splitting**: Dynamic imports
- **Lazy Loading**: Component-level splitting
- **Image Optimization**: Next.js Image component
- **Font Optimization**: Next.js Font optimization
- **Bundle Analysis**: Webpack bundle analyzer

### Caching Strategies
- **Memory Cache**: TTL-based in-memory cache
- **Browser Cache**: Service worker caching
- **API Response Cache**: React Query caching
- **Static Asset Cache**: CDN caching

### Monitoring
- **Performance Monitor**: Dev-only performance tracking
- **Error Reporting**: Sentry integration ready
- **Analytics**: Event tracking ready

---

## Accessibility Features

### WCAG Compliance
- **Semantic HTML**: Proper element usage
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard access
- **Focus Management**: Visible focus indicators
- **Color Contrast**: WCAG AA compliance

### User Preferences
- **Theme Support**: Light/dark mode (planned)
- **Font Size**: Adjustable text size (planned)
- **Reduced Motion**: Animation preferences (planned)

---

## Mobile Responsiveness

### Responsive Design
- **Breakpoints**:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

- **Mobile Optimizations**:
  - Touch-friendly buttons (44px targets)
  - Swipe gestures support
  - Responsive tables (card view on mobile)
  - Collapsible navigation
  - Bottom sheets for mobile modals

---

## Integration Capabilities

### Payment Integrations
- **Tyro EFTPOS**:
  - Terminal pairing
  - Transaction processing
  - Refund handling
  - Status monitoring

### External Services
- **Email Service**: SMTP configuration
- **SMS Service**: Placeholder for SMS provider
- **Calendar Sync**: iCal export ready
- **Accounting**: Export capabilities

---

## Data Management

### Import/Export
- **Supported Formats**:
  - CSV import/export
  - Excel export (via CSV)
  - PDF receipts

- **Data Types**:
  - Customers
  - Services
  - Bookings
  - Transactions
  - Reports

### Backup & Recovery
- **Automatic Backups**: Database level
- **Export Backups**: Manual data export
- **Audit Trail**: Activity logging

---

## Security Measures

### Authentication Security
- **Password Requirements**: Minimum 6 characters
- **Token Security**: HTTPOnly cookies (planned)
- **Session Management**: Automatic timeout
- **Multi-factor Auth**: Planned feature

### Data Security
- **Encryption**: HTTPS only
- **Input Validation**: Client and server-side
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Input sanitization

### Compliance
- **GDPR Ready**: Data export/deletion
- **PCI Compliance**: Via payment providers
- **Privacy Controls**: Customer data management

---

## Future/Planned Features
*Features visible in code but not yet active*

- SMS notifications
- Push notifications
- Two-factor authentication
- Advanced reporting dashboard
- Inventory management
- Marketing campaigns
- Email templates editor
- Custom fields
- API access for third-party integrations
- Mobile app
- Multi-location support
- Franchise management
- Advanced analytics with AI insights
- Voice commands
- Automated scheduling AI

---

*This comprehensive audit documents every accessible feature, button, input, and capability within the Heya POS Merchant App as of the current version.*