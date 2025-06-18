import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:3000/api/v2';

async function testLoyaltyAPI() {
  try {
    console.log('🧪 Testing Loyalty System through API...\n');
    
    // First, login as Hamilton merchant
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/merchant/login', {
      username: 'HAMILTON',
      password: 'demo123'
    });
    
    const loginData = loginResponse.data as any;
    const accessToken = loginData.access_token || loginData.accessToken || loginData.token;
    if (!accessToken) {
      throw new Error('No access token in login response');
    }
    console.log('✅ Logged in successfully\n');
    
    // Set up axios with auth header
    const api = axios.create({
      baseURL: API_BASE,
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
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
    
    // Get Emma's details from merchant app
    const merchantId = emma.merchantId;
    
    // Create a test booking through the API
    // Set time to tomorrow at 2pm to avoid conflicts
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    
    const bookingData = {
      customerId: emma.id,
      locationId: 'f7e4554d-da25-4162-9f4e-f58c8af73f6b', // Hamilton Main
      staffId: '27597e20-198b-41a7-8411-651361d8308a', // Emma Williams
      serviceId: 'fe283936-b595-45e9-9132-a161d88b27d9', // Swedish Massage
      startTime: tomorrow.toISOString(),
      notes: 'Test booking for loyalty'
    };
    
    console.log('📝 Creating booking through API...');
    const createResponse = await api.post('/bookings', bookingData);
    const bookingId = (createResponse.data as any).id;
    console.log(`✅ Created booking: ${bookingId}\n`);
    
    // Start the booking first
    console.log('▶️  Starting booking...');
    const startResponse = await api.patch(`/bookings/${bookingId}/start`);
    console.log(`   Status: ${(startResponse.data as any).status}`);
    
    // Complete the booking to trigger loyalty
    console.log('✅ Marking booking as completed...');
    const completeResponse = await api.patch(`/bookings/${bookingId}/complete`);
    console.log(`   Status: ${(completeResponse.data as any).status}\n`);
    
    // Wait a moment for loyalty processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check Emma's updated stats
    const emmaAfter = await prisma.customer.findUnique({
      where: { id: emma.id }
    });
    
    console.log('📊 Emma Newbie AFTER:');
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
    
    // Check if loyalty transaction was created
    const loyaltyTransaction = await prisma.loyaltyTransaction.findFirst({
      where: {
        bookingId,
        customerId: emma.id
      }
    });
    
    if (loyaltyTransaction) {
      console.log('\n🎁 Loyalty Transaction Created:');
      console.log(`   Type: ${loyaltyTransaction.type}`);
      console.log(`   Points: ${loyaltyTransaction.points}`);
      console.log(`   Description: ${loyaltyTransaction.description}`);
    } else {
      console.log('\n❌ No loyalty transaction found');
    }
    
    // Clean up test booking
    await prisma.booking.delete({ where: { id: bookingId } });
    console.log('\n🧹 Cleaned up test booking');
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.message === 'Unauthorized') {
      console.error('   This might be a permission issue. The endpoint might require specific roles.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testLoyaltyAPI();