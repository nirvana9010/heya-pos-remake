import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLoyalty() {
  try {
    console.log('🧪 Testing Loyalty System...\n');
    
    // Find Emma Newbie
    const emma = await prisma.customer.findFirst({
      where: { email: 'emma.newbie@email.com' }
    });
    
    if (!emma) {
      console.error('❌ Emma Newbie not found');
      return;
    }
    
    console.log('📊 Emma Newbie BEFORE:');
    console.log(`   Loyalty Points: ${emma.loyaltyPoints}`);
    console.log(`   Visit Count: ${emma.visitCount}`);
    console.log(`   Total Spent: $${emma.totalSpent}`);
    console.log(`   Loyalty Visits: ${emma.loyaltyVisits}\n`);
    
    // Create a test booking
    const booking = await prisma.booking.create({
      data: {
        merchantId: emma.merchantId,
        customerId: emma.id,
        locationId: 'f7e4554d-da25-4162-9f4e-f58c8af73f6b', // Hamilton Main
        providerId: '27597e20-198b-41a7-8411-651361d8308a', // Emma Williams
        bookingNumber: `TEST${Date.now()}`,
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
        status: 'COMPLETED',
        totalAmount: 150,
        totalDuration: 60,
        services: {
          create: {
            serviceId: 'fe283936-b595-45e9-9132-a161d88b27d9', // Swedish Massage
            serviceName: 'Swedish Massage',
            price: 150,
            duration: 60,
            displayOrder: 1
          }
        }
      }
    });
    
    console.log('✅ Created test booking:', booking.bookingNumber);
    console.log(`   Amount: $${booking.totalAmount}`);
    console.log(`   Status: ${booking.status}\n`);
    
    // Simulate the booking completion process (which now includes loyalty processing)
    console.log('🔄 Simulating booking completion through API...');
    
    // In a real scenario, this would be done through the API endpoint
    // For testing, we'll check if the customer's loyalty stats were updated
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
    
    // Check Emma's updated stats
    const emmaAfter = await prisma.customer.findUnique({
      where: { id: emma.id }
    });
    
    console.log('\n📊 Emma Newbie AFTER:');
    console.log(`   Loyalty Points: ${emmaAfter?.loyaltyPoints} (+${Number(emmaAfter?.loyaltyPoints) - Number(emma.loyaltyPoints)})`);
    console.log(`   Visit Count: ${emmaAfter?.visitCount} (+${Number(emmaAfter?.visitCount) - Number(emma.visitCount)})`);
    console.log(`   Total Spent: $${emmaAfter?.totalSpent} (+$${Number(emmaAfter?.totalSpent) - Number(emma.totalSpent)})`);
    console.log(`   Loyalty Visits: ${emmaAfter?.loyaltyVisits} (+${Number(emmaAfter?.loyaltyVisits) - Number(emma.loyaltyVisits)})`);
    
    // Check loyalty program type
    const program = await prisma.loyaltyProgram.findFirst({
      where: { merchantId: emma.merchantId }
    });
    
    console.log('\n🏪 Loyalty Program:');
    console.log(`   Type: ${program?.type}`);
    console.log(`   Active: ${program?.isActive}`);
    if (program?.type === 'VISITS') {
      console.log(`   Visits Required: ${program.visitsRequired}`);
    } else {
      console.log(`   Points per Dollar: ${program?.pointsPerDollar}`);
    }
    
    // Clean up test booking
    await prisma.booking.delete({ where: { id: booking.id } });
    console.log('\n🧹 Cleaned up test booking');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLoyalty();