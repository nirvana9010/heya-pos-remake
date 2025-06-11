import { PrismaClient, Service, Staff, Customer, Booking } from '@prisma/client';
import axios from 'axios';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000';
const MERCHANT_USERNAME = 'HAMILTON';

// Helper functions
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePhone(): string {
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

async function login(): Promise<string> {
  try {
    const response = await axios.post(`${API_URL}/api/auth/merchant/login`, {
      username: MERCHANT_USERNAME,
      password: 'demo123'
    });
    return response.data.token as string;
  } catch (error: any) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function populateDenseBookings() {
  console.log('🚀 Starting DENSE database booking population...\n');

  try {
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
              include: { category: true }
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

    // Create additional customers if needed (aim for at least 100)
    const targetCustomerCount = 100;
    const customersToCreate = Math.max(0, targetCustomerCount - customers.length);

    if (customersToCreate > 0) {
      console.log(`Creating ${customersToCreate} additional customers...`);
      
      const newCustomers = [];
      for (let i = 0; i < customersToCreate; i++) {
        const firstName = getRandomItem(firstNames);
        const lastName = getRandomItem(lastNames);
        
        const customer = await prisma.customer.create({
          data: {
            merchant: { connect: { id: merchant.id } },
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

    // Define time slots (15-minute intervals from 9 AM to 7 PM)
    const timeSlots: { hour: number, minute: number }[] = [];
    for (let hour = 9; hour < 19; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        timeSlots.push({ hour, minute });
      }
    }

    // Calculate date range (7 days past, 7 days future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = addDays(today, -7);
    const endDate = addDays(today, 7);

    console.log('📅 Creating DENSE bookings from 7 days ago to 7 days in the future...\n');

    let totalBookings = 0;
    let bookingsByDay: { [key: string]: number } = {};
    let bookingsByStaff: { [key: string]: { [date: string]: any[] } } = {};

    // Initialize staff booking tracking
    staff.forEach(s => {
      bookingsByStaff[s.id] = {};
    });

    // For each day in the range
    for (let d = 0; d <= 14; d++) {
      const currentDate = addDays(startDate, d);
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      
      // Initialize daily tracking
      bookingsByDay[dateKey] = 0;
      staff.forEach(s => {
        bookingsByStaff[s.id][dateKey] = [];
      });

      // Determine booking density based on day
      let bookingDensity = 0.7; // Default 70% fill rate
      let allowOverlaps = true;
      
      // Day-specific patterns
      switch (dayOfWeek) {
        case 0: // Sunday
          bookingDensity = 0.4;
          allowOverlaps = false; // No overlaps on Sundays
          break;
        case 1: // Monday
        case 2: // Tuesday
          bookingDensity = 0.6;
          allowOverlaps = d % 2 === 0; // Alternate days for overlaps
          break;
        case 3: // Wednesday
        case 4: // Thursday
          bookingDensity = 0.75;
          break;
        case 5: // Friday
          bookingDensity = 0.85;
          break;
        case 6: // Saturday
          bookingDensity = 0.9;
          break;
      }

      // Make today and tomorrow extra busy
      const daysFromToday = Math.floor((currentDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (daysFromToday === 0 || daysFromToday === 1) {
        bookingDensity = Math.min(0.95, bookingDensity + 0.1);
      }

      console.log(`\n📅 ${dateKey} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek]}) - Target density: ${Math.round(bookingDensity * 100)}%, Overlaps: ${allowOverlaps ? 'Yes' : 'No'}`);

      let dailyBookings = 0;

      // For each time slot
      for (const slot of timeSlots) {
        // Skip early morning and late evening with some probability
        if ((slot.hour === 9 && Math.random() < 0.3) || (slot.hour === 18 && slot.minute > 0 && Math.random() < 0.5)) {
          continue;
        }

        // Lunch break - reduce bookings between 12-1 PM
        if (slot.hour === 12 && Math.random() < 0.5) {
          continue;
        }

        // Determine if this slot should have bookings
        if (Math.random() < bookingDensity) {
          // Randomly assign to staff members
          const shuffledStaff = [...staff].sort(() => Math.random() - 0.5);
          
          for (const staffMember of shuffledStaff) {
            // Check if we should add a booking for this staff member
            if (Math.random() > 0.8) continue; // Skip some staff/slot combinations
            
            // Check for conflicts if overlaps not allowed
            const startTime = new Date(currentDate);
            startTime.setHours(slot.hour, slot.minute, 0, 0);
            
            const staffDayBookings = bookingsByStaff[staffMember.id][dateKey];
            
            if (!allowOverlaps && staffDayBookings.length > 0) {
              // Check for time conflicts
              const hasConflict = staffDayBookings.some(booking => {
                const bookingStart = new Date(booking.startTime);
                const bookingEnd = new Date(booking.endTime);
                return startTime >= bookingStart && startTime < bookingEnd;
              });
              
              if (hasConflict) continue;
            }

            // Select customer and services
            const customer = getRandomItem(customers);
            const selectedService = getRandomItem(services);
            
            // Sometimes add multiple services
            const additionalServices = Math.random() < 0.2 ? 
              [getRandomItem(services)] : [];
            
            const allServices = [selectedService, ...additionalServices.filter(s => s.id !== selectedService.id)];
            const totalDuration = allServices.reduce((sum, s) => sum + s.duration, 0);
            const totalPrice = allServices.reduce((sum, s) => sum + (s.price instanceof Decimal ? s.price.toNumber() : Number(s.price)), 0);
            
            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + totalDuration);
            
            // Skip if booking would extend past business hours
            if (endTime.getHours() >= 19) continue;

            // Determine status based on date
            let status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'IN_PROGRESS' = 'CONFIRMED';
            
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
              // Create the booking using Prisma
              const booking = await prisma.booking.create({
                data: {
                  merchant: { connect: { id: merchant.id } },
                  location: { connect: { id: location.id } },
                  customer: { connect: { id: customer.id } },
                  staff: { connect: { id: staffMember.id } },
                  startTime: startTime,
                  endTime: endTime,
                  status: status,
                  totalPrice: new Decimal(totalPrice),
                  notes: Math.random() < 0.6 ? getRandomItem(notesTemplates) : undefined,
                  services: {
                    create: allServices.map(service => ({
                      service: { connect: { id: service.id } },
                      staff: { connect: { id: staffMember.id } },
                      price: service.price,
                      duration: service.duration
                    }))
                  }
                }
              });

              // Track the booking
              bookingsByStaff[staffMember.id][dateKey].push({
                startTime: startTime,
                endTime: endTime
              });
              
              dailyBookings++;
              totalBookings++;

              // Create payment for completed bookings
              if (status === 'COMPLETED' && Math.random() < 0.9) {
                await prisma.payment.create({
                  data: {
                    booking: { connect: { id: booking.id } },
                    merchant: { connect: { id: merchant.id } },
                    amount: new Decimal(totalPrice),
                    method: getRandomItem(['CASH', 'CARD', 'CASH', 'CARD', 'CARD']), // More card payments
                    status: 'COMPLETED',
                    paidAt: endTime
                  }
                });
              }

            } catch (error) {
              // Skip on error (likely constraint violation)
              console.error('Booking creation failed:', error);
            }
          }
        }
      }

      bookingsByDay[dateKey] = dailyBookings;
      console.log(`Created ${dailyBookings} bookings for ${dateKey}`);
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

    console.log('\n✨ Dense booking population completed!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the population
populateDenseBookings()
  .catch(console.error)
  .finally(() => process.exit(0));