console.log('🔍 DEBUGGING THE REAL ISSUE\n');

console.log('In bookings-client.ts:');
console.log('- Line 101: return bookings.map((booking: any) => this.transformBooking(booking));');
console.log('- transformBooking() converts "COMPLETED" → "completed"');
console.log('');

console.log('In hooks.ts:');
console.log('- Line 39: const response = await apiClient.getBookings(params);');
console.log('- Line 43: const transformedBookings = response.map((booking: any) => {');
console.log('');

console.log('So the "response" should ALREADY have lowercase status!');
console.log('');

console.log('WAIT! Let me check the transformBooking method again...');
console.log('');

console.log('In bookings-client.ts lines 228-233:');
console.log('const status = booking.status ? ');
console.log('  ((booking.status === "COMPLETE" || booking.status === "COMPLETED") ? "completed" : ');
console.log('   booking.status.toLowerCase().replace(/_/g, "-")) : ');
console.log('  "confirmed";');
console.log('');

console.log('So the BookingsClient DOES transform it to lowercase.');
console.log('');

console.log('The only explanation is that hooks.ts is receiving');
console.log('the already-transformed data, but then NOT using it correctly.');
console.log('');

console.log('Let me add logging to verify what hooks.ts actually receives...');