// Test time comparison logic from Edit booking page

const { fromZonedTime } = require('date-fns-tz');

// Simulate the booking data
const booking = {
  startTime: '2026-12-25T03:00:00.000Z'
};

// Simulate form data (as if user didn't change anything)
const formData = {
  date: '2026-12-25',
  startTime: '14:00' // This is 2:00 PM in Sydney time which is 3:00 AM UTC
};

console.log('=== TIME COMPARISON TEST ===\n');
console.log('Booking startTime (UTC):', booking.startTime);
console.log('Form date:', formData.date);
console.log('Form time:', formData.startTime);

// Replicate the time comparison logic from the Edit page
const [year, month, day] = formData.date.split('-').map(Number);
const [hours, minutes] = formData.startTime.split(':').map(Number);
const newDateInMerchantTZ = new Date(year, month - 1, day, hours, minutes, 0);

console.log('\nNew date in merchant TZ:', newDateInMerchantTZ.toString());

// Convert to UTC for comparison
const newDateUTC = fromZonedTime(newDateInMerchantTZ, 'Australia/Sydney');

console.log('New date in UTC:', newDateUTC.toISOString());

// Parse the original time (already in UTC)
const originalDate = new Date(booking.startTime);

console.log('\nOriginal date:', originalDate.toISOString());

// Compare the actual time values
const timeChanged = newDateUTC.getTime() !== originalDate.getTime();

console.log('\nTime comparison:');
console.log('Original timestamp:', originalDate.getTime());
console.log('New timestamp:', newDateUTC.getTime());
console.log('Time changed?', timeChanged);
console.log('Difference in ms:', Math.abs(newDateUTC.getTime() - originalDate.getTime()));

// Let's also test what happens if we actually change the time
console.log('\n=== TESTING WITH ACTUAL TIME CHANGE ===');
const changedFormData = {
  date: '2026-12-25',
  startTime: '15:00' // Changed to 3:00 PM Sydney time
};

const [year2, month2, day2] = changedFormData.date.split('-').map(Number);
const [hours2, minutes2] = changedFormData.startTime.split(':').map(Number);
const changedDateInMerchantTZ = new Date(year2, month2 - 1, day2, hours2, minutes2, 0);
const changedDateUTC = fromZonedTime(changedDateInMerchantTZ, 'Australia/Sydney');

const timeChanged2 = changedDateUTC.getTime() !== originalDate.getTime();

console.log('Changed form time:', changedFormData.startTime);
console.log('Changed date in UTC:', changedDateUTC.toISOString());
console.log('Time changed?', timeChanged2);

// Test the date extraction logic from the booking
console.log('\n=== TESTING DATE EXTRACTION ===');
const bookingStartTime = new Date(booking.startTime);
const sydneyOffset = 11 * 60; // Sydney is UTC+11 in December (daylight saving)
const sydneyTime = new Date(bookingStartTime.getTime() + sydneyOffset * 60 * 1000);

console.log('Booking UTC time:', bookingStartTime.toISOString());
console.log('Sydney time (manual calc):', sydneyTime.toISOString());
console.log('Hours in Sydney:', sydneyTime.getUTCHours());
console.log('Expected form time:', `${sydneyTime.getUTCHours().toString().padStart(2, '0')}:${sydneyTime.getUTCMinutes().toString().padStart(2, '0')}`);