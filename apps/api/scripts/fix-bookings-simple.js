// Simple script to delete the problematic bookings and recreate them properly
const { execSync } = require('child_process');

console.log('🔧 Fixing booking data...\n');

try {
  // First, delete all existing bookings using Prisma CLI
  console.log('1️⃣ Removing all bookings...');
  execSync('npx prisma db execute --file ./scripts/delete-bookings.sql', { stdio: 'inherit' });
} catch (error) {
  console.log('   Note: Some tables might not exist yet, continuing...\n');
}

// Create SQL file to delete bookings
const fs = require('fs');
const deleteSql = `
-- Delete all booking-related data
DELETE FROM "BookingService";
DELETE FROM "Booking";
`;

fs.writeFileSync('./scripts/delete-bookings.sql', deleteSql);

try {
  execSync('npx prisma db execute --file ./scripts/delete-bookings.sql', { stdio: 'inherit' });
  console.log('✓ Cleaned up existing bookings\n');
} catch (error) {
  console.error('Error cleaning bookings:', error.message);
}

// Now run a more controlled seed
console.log('2️⃣ Creating realistic bookings...');

const seedSql = `
-- Get merchant and location IDs
WITH merchant_data AS (
  SELECT m.id as merchant_id, l.id as location_id
  FROM "Merchant" m
  JOIN "Location" l ON l."merchantId" = m.id
  WHERE m.name = 'Hamilton Beauty Spa'
  LIMIT 1
),
staff_data AS (
  SELECT id, "firstName", "lastName"
  FROM "Staff"
  WHERE "merchantId" = (SELECT merchant_id FROM merchant_data)
),
service_data AS (
  SELECT id, name, price, duration
  FROM "Service"
  WHERE "merchantId" = (SELECT merchant_id FROM merchant_data)
  AND "isActive" = true
),
customer_data AS (
  SELECT id, "firstName", "lastName"
  FROM "Customer"
  WHERE "merchantId" = (SELECT merchant_id FROM merchant_data)
  LIMIT 50
)
-- Insert some sample bookings
INSERT INTO "Booking" (
  id, "merchantId", "locationId", "customerId", "bookingNumber", 
  status, "startTime", "endTime", "totalAmount", "createdById", 
  "providerId", "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid(),
  (SELECT merchant_id FROM merchant_data),
  (SELECT location_id FROM merchant_data),
  c.id,
  'BK' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(ROW_NUMBER() OVER()::text, 4, '0'),
  CASE 
    WHEN booking_date < CURRENT_DATE THEN 'COMPLETED'
    WHEN booking_date = CURRENT_DATE AND booking_time < CURRENT_TIME THEN 'COMPLETED'
    WHEN booking_date = CURRENT_DATE THEN 'CONFIRMED'
    ELSE 'CONFIRMED'
  END,
  booking_date + booking_time,
  booking_date + booking_time + INTERVAL '1 hour',
  120.00,
  s.id,
  s.id,
  NOW(),
  NOW()
FROM (
  -- Generate booking slots
  SELECT 
    CURRENT_DATE - INTERVAL '7 days' + (day_offset || ' days')::INTERVAL as booking_date,
    ('09:00:00'::TIME + (hour_offset || ' hours')::INTERVAL) as booking_time,
    day_offset,
    hour_offset
  FROM 
    generate_series(0, 14) as day_offset,
    generate_series(0, 8, 2) as hour_offset
  WHERE 
    -- Reduce bookings on Sundays
    (EXTRACT(DOW FROM CURRENT_DATE - INTERVAL '7 days' + (day_offset || ' days')::INTERVAL) != 0 OR hour_offset IN (2, 4, 6))
    -- Only book during business hours
    AND hour_offset < 9
) as slots
CROSS JOIN LATERAL (
  SELECT id FROM staff_data ORDER BY RANDOM() LIMIT 1
) s
CROSS JOIN LATERAL (
  SELECT id FROM customer_data ORDER BY RANDOM() LIMIT 1
) c
WHERE RANDOM() < 0.4; -- 40% booking rate

`;

fs.writeFileSync('./scripts/seed-bookings.sql', seedSql);

try {
  execSync('npx prisma db execute --file ./scripts/seed-bookings.sql', { stdio: 'inherit' });
  console.log('✓ Created realistic bookings\n');
} catch (error) {
  console.error('Error creating bookings:', error.message);
}

console.log('✨ Booking fix completed!');
console.log('\nRun this to check the results:');
console.log('  node scripts/check-bookings.js');