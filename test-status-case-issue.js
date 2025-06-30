console.log('🔍 STATUS CASE SENSITIVITY ISSUE FOUND!\n');

console.log('THE PROBLEM:');
console.log('1. Backend returns status as "COMPLETED" (uppercase)');
console.log('2. bookings-client.ts transforms it to "completed" (lowercase) - lines 230-233');
console.log('3. BUT hooks.ts (line 65) passes the status through WITHOUT using the client!');
console.log('4. Calendar filter checks for "completed" (lowercase)');
console.log('5. "COMPLETED" !== "completed" so the booking is filtered out!\n');

console.log('EVIDENCE:');
console.log('- hooks.ts line 39: const response = await apiClient.getBookings(params);');
console.log('- hooks.ts line 65: status: booking.status, // NO TRANSFORMATION!');
console.log('- CalendarPage.tsx line 638: checked={state.selectedStatusFilters.includes("completed")}');
console.log('');

console.log('This explains why completed bookings disappear:');
console.log('- The status is "COMPLETED" but the filter checks for "completed"');
console.log('- Even with the filter enabled, it won\'t match!\n');

console.log('THE FIX:');
console.log('In hooks.ts, line 65 should transform the status to lowercase:');
console.log('');
console.log('BEFORE: status: booking.status,');
console.log('AFTER:  status: booking.status.toLowerCase().replace(/_/g, "-"),');