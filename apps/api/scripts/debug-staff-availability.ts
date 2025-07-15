import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugStaffAvailability() {
  console.log('🔍 DEBUGGING STAFF AVAILABILITY ISSUE\n');

  // Check both Hamilton and Zen Wellness
  const merchants = await prisma.merchant.findMany({
    where: { 
      subdomain: { in: ['hamilton', 'zen-wellness'] }
    },
    select: {
      id: true,
      name: true,
      subdomain: true,
      settings: true
    }
  });

  console.log(`Found ${merchants.length} merchants to check\n`);

  for (const merchant of merchants) {
    console.log(`\n=== ${merchant.name} (${merchant.subdomain}) ===`);

    // Check merchant business hours
    const settings = merchant.settings as any;
    console.log('📋 Merchant Settings:');
    if (settings?.businessHours) {
      console.log('  ✅ Business hours configured');
      console.log('  Sample day:', JSON.stringify(settings.businessHours.monday || settings.businessHours.Monday || 'Not found'));
    } else {
      console.log('  ❌ No business hours configured');
    }

    // Check staff
    const staff = await prisma.staff.findMany({
      where: { 
        merchantId: merchant.id,
        status: 'ACTIVE'
      },
      include: {
        schedules: true,
        locations: {
          include: {
            location: true
          }
        }
      }
    });

    console.log(`\n👥 Staff Members (${staff.length} active):`);
    
    if (staff.length === 0) {
      console.log('  ❌ No active staff found!');
      continue;
    }

    for (const staffMember of staff) {
      console.log(`\n  Staff: ${staffMember.firstName} ${staffMember.lastName} (${staffMember.id})`);
      console.log(`    Status: ${staffMember.status}`);
      console.log(`    Locations: ${staffMember.locations.length} assigned`);
      
      // Check schedules
      if (staffMember.schedules.length === 0) {
        console.log('    ❌ No schedules found!');
      } else {
        console.log(`    ✅ ${staffMember.schedules.length} schedules found:`);
        staffMember.schedules.forEach(schedule => {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          console.log(`      ${days[schedule.dayOfWeek]}: ${schedule.startTime} - ${schedule.endTime}`);
        });
      }
    }

    // Check recent bookings for context
    const recentBookings = await prisma.booking.findMany({
      where: { 
        merchantId: merchant.id,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        provider: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    console.log(`\n📅 Recent Bookings (last 7 days): ${recentBookings.length}`);
    recentBookings.forEach(booking => {
      const providerName = booking.provider ? `${booking.provider.firstName} ${booking.provider.lastName}` : 'Unknown';
      console.log(`  ${booking.startTime.toISOString()} - ${providerName} - ${booking.status}`);
    });

    // Check services
    const services = await prisma.service.findMany({
      where: { 
        merchantId: merchant.id,
        isActive: true
      },
      take: 3,
      select: {
        id: true,
        name: true,
        duration: true,
        paddingBefore: true,
        paddingAfter: true
      }
    });

    console.log(`\n🛠️ Services (${services.length} active):`);
    services.forEach(service => {
      console.log(`  ${service.name}: ${service.duration}min (padding: ${service.paddingBefore}+${service.paddingAfter})`);
    });
  }

  console.log('\n=== SUMMARY ===');
  console.log('Issues to check:');
  console.log('1. Staff without schedules');
  console.log('2. Merchants without business hours');
  console.log('3. Inactive staff members');
  console.log('4. Missing location assignments');
}

debugStaffAvailability()
  .catch(console.error)
  .finally(() => prisma.$disconnect());