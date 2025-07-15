import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMissingStaffSchedules() {
  console.log('🔧 FIXING MISSING STAFF SCHEDULES\n');

  // Find all staff members without schedules
  const staffWithoutSchedules = await prisma.staff.findMany({
    where: {
      status: 'ACTIVE',
      schedules: {
        none: {}
      }
    },
    include: {
      schedules: true,
      merchant: {
        select: {
          name: true,
          subdomain: true,
          settings: true
        }
      }
    }
  });

  console.log(`Found ${staffWithoutSchedules.length} staff members without schedules`);

  if (staffWithoutSchedules.length === 0) {
    console.log('✅ All staff members have schedules');
    return;
  }

  for (const staff of staffWithoutSchedules) {
    console.log(`\n--- Fixing ${staff.firstName} ${staff.lastName} (${staff.merchant.name}) ---`);
    
    // Get merchant business hours
    const settings = staff.merchant.settings as any;
    const businessHours = settings?.businessHours;
    
    if (!businessHours) {
      console.log('❌ No business hours configured for merchant');
      continue;
    }

    // Create schedules based on business hours
    const scheduleData = [];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dayName = dayNames[dayOfWeek];
      const dayHours = businessHours[dayName] || businessHours[dayName.charAt(0).toUpperCase() + dayName.slice(1)];
      
      if (dayHours && dayHours.isOpen) {
        scheduleData.push({
          staffId: staff.id,
          dayOfWeek: dayOfWeek,
          startTime: dayHours.open,
          endTime: dayHours.close
        });
      }
    }
    
    if (scheduleData.length === 0) {
      console.log('❌ No valid business hours found');
      continue;
    }
    
    console.log(`Creating ${scheduleData.length} schedules...`);
    
    // Create the schedules
    try {
      await prisma.staffSchedule.createMany({
        data: scheduleData
      });
      
      console.log('✅ Schedules created successfully');
      
      // Show created schedules
      scheduleData.forEach(schedule => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`  ${days[schedule.dayOfWeek]}: ${schedule.startTime} - ${schedule.endTime}`);
      });
    } catch (error) {
      console.error('❌ Error creating schedules:', error);
    }
  }
  
  console.log('\n=== SCHEDULE CREATION COMPLETE ===');
  console.log('All active staff members should now have schedules');
  console.log('Staff availability should now work correctly');
}

fixMissingStaffSchedules()
  .catch(console.error)
  .finally(() => prisma.$disconnect());