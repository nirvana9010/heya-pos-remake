# Booking Population Scripts

This directory contains scripts to populate the database with mock bookings for testing the UI with various booking densities.

## Available Scripts

### 1. Check Current Statistics
```bash
npm run check:stats
```
Shows current booking statistics including:
- Total counts (bookings, customers, staff, services)
- Bookings by status
- Daily booking distribution
- Busiest hour and most popular service

### 2. Basic Booking Population
```bash
npm run populate:bookings
```
Creates a moderate amount of bookings:
- ~25 bookings spread across past, present, and future
- Mix of booking statuses (completed, confirmed, cancelled, no-show)
- Basic customer set

### 3. Busy Booking Population (Recommended for UI Testing)
```bash
npm run populate:busy
```
Creates a DENSE booking schedule to test UI with busy periods:
- Generates bookings from last week to next week
- Creates 50+ customers if needed
- Fills 70-90% of available time slots
- Creates overlapping bookings to test conflict handling
- Varies density by day (today/tomorrow are busiest)
- Includes realistic patterns:
  - Reduced lunch hour bookings
  - Saturdays are busier
  - Mix of single and multiple service bookings
  - Various booking statuses based on date

### 4. Comprehensive Seed (Full Reset)
```bash
npm run prisma:seed:hamilton
```
Creates comprehensive test data including:
- Past 30 days of historical bookings
- Future 30 days of upcoming bookings
- Invoices and payments for completed bookings
- Loyalty program data
- Recurring weekly appointments
- Group bookings (e.g., bridal parties)

## Usage Flow

1. **Check current state:**
   ```bash
   npm run check:stats
   ```

2. **Run the busy populate script:**
   ```bash
   npm run populate:busy
   ```

3. **Check results:**
   ```bash
   npm run check:stats
   ```

4. **Test the UI:**
   - Open the merchant app calendar view
   - Check how it handles busy days
   - Test the booking list view with many items
   - Verify performance with dense schedules

## Notes

- The scripts use the Hamilton Beauty Spa merchant (username: HAMILTON)
- Default password is 'demo123'
- Scripts will skip bookings that would create conflicts
- All times are in the merchant's timezone (Australia/Sydney)
- The busy script creates 15-minute interval bookings for realistic density

## Resetting Data

To completely reset and start fresh:
```bash
npm run prisma:reset
npm run prisma:seed
npm run prisma:seed:hamilton
```

This will:
1. Reset the database
2. Run basic seed
3. Run comprehensive Hamilton seed