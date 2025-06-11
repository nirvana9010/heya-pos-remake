const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000';
const MERCHANT_USERNAME = 'HAMILTON';

// Helper functions
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePhone() {
  const prefix = ['0412', '0423', '0434', '0445', '0456', '0467', '0478', '0489', '0490', '0401'];
  return prefix[Math.floor(Math.random() * prefix.length)] + Math.floor(Math.random() * 9000000 + 1000000);
}

// Customer name data
const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Sophia', 'Mason', 'Isabella', 'Lucas', 'Mia',
  'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Ella', 'Avery', 'Sofia',
  'James', 'William', 'Benjamin', 'Elijah', 'Oliver', 'Jacob', 'Daniel', 'Logan', 'Michael', 'Alexander',
  'Sarah', 'Jessica', 'Ashley', 'Rachel', 'Samantha', 'Katherine', 'Amanda', 'Jennifer', 'Lauren', 'Melissa',
  'John', 'Robert', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Christopher', 'Matthew', 'Anthony',
  'Linda', 'Patricia', 'Barbara', 'Susan', 'Margaret', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Dorothy',
  'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan', 'Gary'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White',
  'Lopez', 'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall',
  'Chen', 'Wang', 'Li', 'Zhang', 'Kumar', 'Singh', 'Patel', 'Kim', 'Park', 'Nguyen',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Hill', 'Flores', 'Green', 'Adams',
  'Nelson', 'Baker', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans'
];

// Booking notes templates
const notesTemplates = [
  'Regular customer - prefers organic products',
  'First time visitor - referred by friend',
  'Special occasion - birthday treat',
  'Monthly appointment - please confirm 24h before',
  'Sensitive skin - use hypoallergenic products',
  'VIP client - extra attention required',
  'Prefers morning appointments',
  'Last minute booking',
  'Package deal customer',
  'Loyalty program member',
  'Anniversary special',
  'Gift voucher redemption',
  '',  // Empty notes for variety
  '',
  ''
];

async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/merchant/login`, {
      username: MERCHANT_USERNAME,
      password: 'demo123'
    });
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

// First, clean up existing bookings
async function cleanupBookings() {
  console.log('🧹 Cleaning up existing bookings...');
  
  try {
    // Delete all bookings for Hamilton merchant
    const merchantAuth = await prisma.merchantAuth.findFirst({
      where: { username: MERCHANT_USERNAME },
      include: { merchant: true }
    });

    if (merchantAuth?.merchant) {
      await prisma.bookingService.deleteMany({
        where: { booking: { merchantId: merchantAuth.merchant.id } }
      });
      
      await prisma.booking.deleteMany({
        where: { merchantId: merchantAuth.merchant.id }
      });
      
      console.log('✓ Cleaned up existing bookings\n');
    }
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}

async function populateRealisticBookings() {
  console.log('🚀 Starting REALISTIC booking population...\n');

  try {
    // Clean up first
    await cleanupBookings();

    // Login to get token for API calls
    console.log('Logging in...');
    const token = await login();
    console.log('✓ Login successful\n');

    // Get the Hamilton merchant using MerchantAuth
    const merchantAuth = await prisma.merchantAuth.findFirst({
      where: { username: MERCHANT_USERNAME },
      include: { 
        merchant: {
          include: {
            locations: true,
            staff: true,
            services: {
              include: { categoryModel: true }
            },
            customers: true
          }
        }
      }
    });

    if (!merchantAuth?.merchant) {
      throw new Error('Hamilton merchant not found. Please run seed first.');
    }

    const merchant = merchantAuth.merchant;
    const location = merchant.locations[0];
    const staff = merchant.staff;
    const services = merchant.services;
    let customers = merchant.customers;

    console.log(`Found ${services.length} services, ${staff.length} staff members, ${customers.length} customers\n`);

    // Create additional customers if needed (aim for at least 50)
    const targetCustomerCount = 50;
    const customersToCreate = Math.max(0, targetCustomerCount - customers.length);

    if (customersToCreate > 0) {
      console.log(`Creating ${customersToCreate} additional customers...`);
      
      const newCustomers = [];
      for (let i = 0; i < customersToCreate; i++) {
        const firstName = getRandomItem(firstNames);
        const lastName = getRandomItem(lastNames);
        
        const customer = await prisma.customer.create({
          data: {
            merchantId: merchant.id,
            firstName: firstName,
            lastName: lastName,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@example.com`,
            phone: generatePhone(),
            loyaltyPoints: Math.floor(Math.random() * 500),
            totalSpent: Math.floor(Math.random() * 2000)
          }
        });
        
        newCustomers.push(customer);
      }
      
      customers = [...customers, ...newCustomers];
      console.log(`✓ Created ${newCustomers.length} customers. Total: ${customers.length}\n`);
    }

    // Define realistic booking patterns
    const bookingPatterns = {
      // Weekday patterns (Mon-Fri)
      weekday: {
        9: 0.3,   // 30% chance at 9 AM
        10: 0.6,  // 60% chance at 10 AM
        11: 0.7,  // 70% chance at 11 AM
        12: 0.3,  // 30% chance at noon (lunch)
        13: 0.4,  // 40% chance at 1 PM
        14: 0.6,  // 60% chance at 2 PM
        15: 0.7,  // 70% chance at 3 PM
        16: 0.6,  // 60% chance at 4 PM
        17: 0.5,  // 50% chance at 5 PM
        18: 0.3   // 30% chance at 6 PM
      },
      // Saturday pattern
      saturday: {
        9: 0.5,   // 50% chance at 9 AM
        10: 0.8,  // 80% chance at 10 AM
        11: 0.9,  // 90% chance at 11 AM
        12: 0.7,  // 70% chance at noon
        13: 0.7,  // 70% chance at 1 PM
        14: 0.8,  // 80% chance at 2 PM
        15: 0.8,  // 80% chance at 3 PM
        16: 0.6,  // 60% chance at 4 PM
        17: 0.4,  // 40% chance at 5 PM
        18: 0.2   // 20% chance at 6 PM
      },
      // Sunday pattern
      sunday: {
        10: 0.3,  // 30% chance at 10 AM
        11: 0.4,  // 40% chance at 11 AM
        12: 0.3,  // 30% chance at noon
        13: 0.3,  // 30% chance at 1 PM
        14: 0.4,  // 40% chance at 2 PM
        15: 0.3,  // 30% chance at 3 PM
        16: 0.2   // 20% chance at 4 PM
      }
    };

    // Calculate date range (7 days past, 7 days future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = addDays(today, -7);
    const endDate = addDays(today, 7);

    console.log('📅 Creating REALISTIC bookings from 7 days ago to 7 days in the future...\n');

    let totalBookings = 0;
    let bookingsByDay = {};

    // For each day in the range
    for (let d = 0; d <= 14; d++) {
      const currentDate = addDays(startDate, d);
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      
      // Determine pattern based on day
      let pattern;
      if (dayOfWeek === 0) {
        pattern = bookingPatterns.sunday;
      } else if (dayOfWeek === 6) {
        pattern = bookingPatterns.saturday;
      } else {
        pattern = bookingPatterns.weekday;
      }

      console.log(`\n📅 ${dateKey} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]})`);

      let dailyBookings = 0;
      let staffSchedules = {};
      
      // Initialize staff schedules
      staff.forEach(s => {
        staffSchedules[s.id] = [];
      });

      // For each hour in the pattern
      for (const [hour, probability] of Object.entries(pattern)) {
        const hourNum = parseInt(hour);
        
        // For each 15-minute slot in the hour
        for (let minute = 0; minute < 60; minute += 15) {
          // Determine if this slot should have a booking
          if (Math.random() < probability) {
            // Pick a random staff member
            const availableStaff = staff.filter(s => {
              // Check if staff is available at this time
              const slotStart = new Date(currentDate);
              slotStart.setHours(hourNum, minute, 0, 0);
              
              // Check for conflicts
              return !staffSchedules[s.id].some(booking => {
                const bookingEnd = new Date(booking.endTime);
                return slotStart < bookingEnd;
              });
            });

            if (availableStaff.length === 0) continue;

            const staffMember = getRandomItem(availableStaff);
            const customer = getRandomItem(customers);
            const selectedService = getRandomItem(services);
            
            // 20% chance of multiple services
            const additionalServices = Math.random() < 0.2 ? 
              [getRandomItem(services.filter(s => s.id !== selectedService.id))] : [];
            
            const allServices = [selectedService, ...additionalServices];
            const totalDuration = allServices.reduce((sum, s) => sum + s.duration, 0);
            const totalPrice = allServices.reduce((sum, s) => sum + Number(s.price), 0);
            
            const startTime = new Date(currentDate);
            startTime.setHours(hourNum, minute, 0, 0);
            
            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + totalDuration);
            
            // Skip if booking would extend past business hours
            if (endTime.getHours() >= 19 || (endTime.getHours() === 18 && endTime.getMinutes() > 30)) continue;

            // Determine status based on date
            let status = 'CONFIRMED';
            
            if (currentDate < today) {
              // Past bookings
              const rand = Math.random();
              if (rand < 0.75) status = 'COMPLETED';
              else if (rand < 0.85) status = 'CANCELLED';
              else if (rand < 0.95) status = 'NO_SHOW';
              else status = 'COMPLETED';
            } else if (currentDate.toDateString() === today.toDateString()) {
              // Today's bookings
              const now = new Date();
              if (endTime < now) {
                status = Math.random() < 0.9 ? 'COMPLETED' : 'NO_SHOW';
              } else if (startTime < now && endTime > now) {
                status = 'IN_PROGRESS';
              } else {
                status = Math.random() < 0.9 ? 'CONFIRMED' : 'PENDING';
              }
            } else {
              // Future bookings
              status = Math.random() < 0.85 ? 'CONFIRMED' : 'PENDING';
            }

            try {
              // Generate a unique booking number
              const bookingNumber = `BK${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
              
              // Create the booking using Prisma
              const booking = await prisma.booking.create({
                data: {
                  merchantId: merchant.id,
                  locationId: location.id,
                  customerId: customer.id,
                  providerId: staffMember.id,
                  createdById: staffMember.id,
                  bookingNumber: bookingNumber,
                  startTime: startTime,
                  endTime: endTime,
                  status: status,
                  totalAmount: totalPrice,
                  notes: Math.random() < 0.3 ? getRandomItem(notesTemplates) : undefined,
                  services: {
                    create: allServices.map(service => ({
                      serviceId: service.id,
                      staffId: staffMember.id,
                      price: Number(service.price),
                      duration: service.duration
                    }))
                  }
                }
              });

              // Track the booking in staff schedule
              staffSchedules[staffMember.id].push({
                startTime: startTime,
                endTime: endTime
              });
              
              dailyBookings++;
              totalBookings++;

            } catch (error) {
              if (!error.message.includes('Unique constraint')) {
                console.error('Booking creation failed:', error.message);
              }
            }
          }
        }
      }

      bookingsByDay[dateKey] = dailyBookings;
      console.log(`   Created ${dailyBookings} bookings`);
    }

    console.log('\n\n📊 SUMMARY:');
    console.log('═══════════════════════════════════════');
    console.log(`✓ Total bookings created: ${totalBookings}`);
    console.log(`✓ Total customers: ${customers.length}`);
    console.log(`✓ Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log('\n📅 Bookings by day:');
    
    Object.entries(bookingsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, count]) => {
        const dayDate = new Date(date);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayDate.getDay()];
        console.log(`   ${date} (${dayName}): ${count} bookings`);
      });

    console.log('\n✨ Realistic booking population completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the population
populateRealisticBookings()
  .catch(console.error)
  .finally(() => process.exit(0));