import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

console.log('=== DATE FILTERING ISSUE DEMONSTRATION ===\n');

// The date string from the UI (likely in merchant's timezone)
const dateFromUI = '2025-06-01';
console.log(`Date from UI: ${dateFromUI}`);

// Current approach (what the service is doing)
const dateObj = new Date(dateFromUI);
const dayStart = startOfDay(dateObj);
const dayEnd = endOfDay(dateObj);

console.log('\nCurrent approach (server timezone):');
console.log(`Date object: ${dateObj}`);
console.log(`Start of day: ${dayStart.toISOString()} (${dayStart})`);
console.log(`End of day: ${dayEnd.toISOString()} (${dayEnd})`);

// What's happening:
// If the user is looking for bookings on June 1, but the server interprets this
// in its local timezone, it might be querying for May 31 14:00 UTC to June 1 13:59 UTC
// This would miss bookings that are actually on June 1 in the merchant's timezone

// Better approach: Handle dates in merchant's timezone
const merchantTimezone = 'Australia/Sydney';
console.log(`\nBetter approach (merchant timezone: ${merchantTimezone}):`);

// Parse the date as a date-only value and set it to the merchant's timezone
const dateInMerchantTz = new Date(dateFromUI + 'T00:00:00');
const startInMerchantTz = fromZonedTime(dateFromUI + 'T00:00:00', merchantTimezone);
const endInMerchantTz = fromZonedTime(dateFromUI + 'T23:59:59.999', merchantTimezone);

console.log(`Start of day (merchant TZ -> UTC): ${startInMerchantTz.toISOString()}`);
console.log(`End of day (merchant TZ -> UTC): ${endInMerchantTz.toISOString()}`);

// Alternative approach: Use UTC boundaries
console.log('\nAlternative approach (UTC boundaries):');
const utcStart = new Date(dateFromUI + 'T00:00:00Z');
const utcEnd = new Date(dateFromUI + 'T23:59:59.999Z');
console.log(`UTC Start: ${utcStart.toISOString()}`);
console.log(`UTC End: ${utcEnd.toISOString()}`);

// Show the difference in SQL queries
console.log('\n=== RESULTING SQL QUERIES ===');
console.log('\nCurrent approach would query:');
console.log(`WHERE startTime >= '${dayStart.toISOString()}' AND startTime <= '${dayEnd.toISOString()}'`);

console.log('\nMerchant timezone approach would query:');
console.log(`WHERE startTime >= '${startInMerchantTz.toISOString()}' AND startTime <= '${endInMerchantTz.toISOString()}'`);

console.log('\nUTC approach would query:');
console.log(`WHERE startTime >= '${utcStart.toISOString()}' AND startTime <= '${utcEnd.toISOString()}'`);