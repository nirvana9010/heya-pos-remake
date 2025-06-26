# Manual Customer Search Test

## Steps to reproduce the issue:

1. Open browser and navigate to http://localhost:3002
2. Login using the "Quick Login as Hamilton" button
3. Go to the Calendar page
4. Click on any available time slot in the calendar grid
5. When the booking slideout opens, look for the customer search input
6. Open browser developer console (F12)
7. Type "test" in the customer search input
8. Check the console for the following logs:
   - 🔍 CustomerSearchInput: Starting search for: test
   - 🔍 CustomerSearchInput: apiClient available? true
   - 🔍 CustomerSearchInput: apiClient.searchCustomers available? true
   - Either:
     - ✅ CustomerSearchInput: API call succeeded, response: [data]
     - ❌ CustomerSearchInput: Customer search failed: [error]
     - ⚠️ CustomerSearchInput: Falling back to filtering X pre-loaded customers

## What to check:

1. If you see the ❌ error log, check the error details for:
   - error.message
   - error.response (might indicate API response)
   - error.config (shows the API request config)

2. If you see ⚠️ fallback log, it means the API call failed and it's using pre-loaded customers

3. Check the Network tab in developer tools:
   - Filter by "XHR" or "Fetch"
   - Look for any requests to `/api/v1/customers/search`
   - If no request is made, the error is happening before the API call
   - If a request is made but fails, check the response status and error

## Current hypothesis:

Based on the code investigation, the customer search should work like this:
1. User types in the search input
2. After 300ms debounce, `searchCustomers` is called
3. It should call `apiClient.searchCustomers(query)`
4. If that fails, it falls back to filtering pre-loaded customers

The intermittent issue suggests that sometimes the API call succeeds and sometimes it fails, triggering the fallback behavior.