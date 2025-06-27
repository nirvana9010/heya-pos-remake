# Next Available Staff - Manual Testing Guide

## Overview
This guide helps you manually test the enhanced "Next Available Staff" feature that now:
- Always resolves to a valid staff UUID before API submission
- Shows real-time staff assignment in the UI
- Handles edge cases gracefully

## Prerequisites
1. API running on port 3000
2. Merchant app running on port 3002
3. At least 2 staff members in the system
4. Some test bookings to create availability conflicts

## Test Scenarios

### 1. Basic "Next Available" Selection
**Steps:**
1. Open merchant app calendar
2. Click "New Booking"
3. Select a date and time
4. In Staff dropdown, select "Next Available"
5. Select a service

**Expected:**
- ✅ Dropdown shows "Next Available (X available)"
- ✅ Below dropdown shows "Will be assigned to: [Staff Name]"
- ✅ The assigned staff has the least bookings (load balancing)
- ✅ Assigned staff updates if you change time/date

### 2. All Staff Busy
**Steps:**
1. Create bookings for all staff at 2:00 PM
2. Try to create new booking at 2:00 PM
3. Select "Next Available"

**Expected:**
- ✅ Dropdown shows "No staff available"
- ✅ Message: "No staff available at this time. Please select a different time."
- ✅ Next button is disabled
- ✅ Cannot proceed to confirmation

### 3. Real-time Updates
**Steps:**
1. Select "Next Available"
2. Note which staff will be assigned
3. Change the time
4. Observe the updates

**Expected:**
- ✅ Loading spinner appears while checking
- ✅ "Checking staff availability..." message
- ✅ Assigned staff updates based on new time
- ✅ Available count updates

### 4. Service Duration Conflicts
**Steps:**
1. Create a 60-minute booking at 3:00 PM for Staff A
2. Try new booking at 3:30 PM (30-min service)
3. Select "Next Available"

**Expected:**
- ✅ Staff A marked as "Busy at 3:00 PM"
- ✅ Next Available assigns to different staff
- ✅ Conflict reason shown in dropdown

### 5. Confirmation Screen
**Steps:**
1. Complete booking with "Next Available"
2. Reach confirmation screen

**Expected:**
- ✅ Shows "[Staff Name] (auto-assigned)"
- ✅ Not just "Next Available"
- ✅ Confirms which staff will handle booking

### 6. API Submission
**Steps:**
1. Open browser DevTools > Network tab
2. Complete a "Next Available" booking
3. Check the API request payload

**Expected:**
- ✅ staffId is a valid UUID (e.g., "123e4567-e89b-12d3-a456-426614174000")
- ✅ NOT "NEXT_AVAILABLE", null, or empty string
- ✅ Booking creates successfully

### 7. Edge Case: Rapid Changes
**Steps:**
1. Select "Next Available"
2. Rapidly change date/time multiple times
3. Submit immediately after last change

**Expected:**
- ✅ No errors
- ✅ Uses the final selection
- ✅ Loading states handle properly

### 8. Calendar View Integration
**Steps:**
1. From calendar day view, click time slot
2. Booking slideout opens with that time
3. Select "Next Available"

**Expected:**
- ✅ Time pre-filled correctly
- ✅ Availability checked immediately
- ✅ Shows assigned staff

## Common Issues to Check

### ❌ "No staff ID" Error
This should NEVER happen now. If it does:
1. Check browser console for errors
2. Verify staffId in network request
3. Check if it's sending invalid values

### ❌ Wrong Staff Assigned
If assigned staff isn't actually available:
1. Check booking transformation in availability service
2. Verify time zone handling
3. Check status filtering (cancelled bookings)

### ❌ No Loading States
If changes appear instant without loading:
1. Check isCheckingAvailability state
2. Verify useEffect dependencies
3. Check if service is actually async

## Success Criteria

The implementation is successful when:
1. ✅ 100% of bookings have valid UUID staffId
2. ✅ Users see who will be assigned BEFORE confirming
3. ✅ No "missing staffId" API errors
4. ✅ Load balancing works (fewer bookings = higher priority)
5. ✅ Clear feedback when no staff available

## Developer Console Checks

Open browser console and look for:
```
🔍 [AvailabilityCheck] Starting check:
✅ [AvailabilityCheck] Complete:
🔍 [CalendarPage] Processing booking with staffId:
✅ [CalendarPage] Using provided valid staffId:
```

These logs confirm the system is working correctly.