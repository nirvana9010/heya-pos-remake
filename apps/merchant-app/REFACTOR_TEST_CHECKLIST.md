# Post-Refactor Test Checklist

## What Changed
- Split 5 major pages into lightweight wrappers + async content components
- Each page now loads instantly with a loading state, then loads content in background
- Total of ~3,700 lines of code moved to new files

## Critical Things to Test

### 1. Navigation Speed
- [ ] Navigate between pages - should see loading state immediately (no freeze)
- [ ] Loading states should appear for < 1 second on most pages

### 2. Page Functionality

#### Customers Page (`/customers`)
- [ ] Search functionality works
- [ ] Customer cards display correctly  
- [ ] Add/Edit customer dialogs work
- [ ] Pagination works
- [ ] Stats cards show correct data

#### Services Page (`/services`)
- [ ] Service table displays
- [ ] Inline editing for price/duration works
- [ ] Add/Edit service slide-out works
- [ ] Bulk price update works
- [ ] Search with debouncing works

#### Bookings Page (`/bookings`)
- [ ] Booking list displays
- [ ] Status filters work
- [ ] Date filtering works
- [ ] Booking stats show correctly
- [ ] Progress bars show for in-progress bookings (fixed during refactor)

#### Calendar Page (`/calendar`)
- [ ] Calendar grid displays
- [ ] Day/Week view toggle works
- [ ] Create booking from calendar works
- [ ] Booking details slide-out works
- [ ] Staff filtering works

#### Staff Page (`/staff`)
- [ ] Staff list displays
- [ ] Add/Edit staff works
- [ ] Availability toggle works
- [ ] Service assignments work

### 3. Data Loading
- [ ] All API calls still work correctly
- [ ] Loading states show while data loads
- [ ] Error states display when API fails

### 4. State Management
- [ ] Form data persists when editing
- [ ] Selected filters/search persist during the session
- [ ] Toast notifications still appear

## Known Changes
1. Removed `Progress` component from bookings (replaced with custom progress bar)
2. All pages now have `ssr: false` for faster client-side navigation
3. Initial page load shows loading state briefly

## If Something Broke
The original page components are preserved as:
- `customers/page-original.tsx` 
- `services/page-old.tsx`

You can revert by copying the content back to the main page.tsx files.