import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStaffRecords() {
  try {
    console.log('Checking staff records...\n');
    
    // Get merchant through auth
    const merchantAuth = await prisma.merchantAuth.findFirst({
      where: { username: 'HAMILTON' },
      include: { merchant: true }
    });
    
    if (!merchantAuth) {
      console.log('Merchant auth not found');
      return;
    }
    
    const merchant = merchantAuth.merchant;
    
    if (!merchant) {
      console.log('Merchant not found');
      return;
    }
    
    console.log('Merchant:', {
      id: merchant.id,
      name: merchant.name,
      username: merchant.username
    });
    
    // Get staff for this merchant
    const staff = await prisma.staff.findMany({
      where: { merchantId: merchant.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        accessLevel: true,
        status: true
      }
    });
    
    console.log(`\nFound ${staff.length} staff members:`);
    staff.forEach(s => {
      console.log(`- ${s.firstName} ${s.lastName} (${s.id}) - Access: ${s.accessLevel} - Status: ${s.status}`);
    });
    
    // Check if merchant user has a corresponding staff record
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { 
        merchantId: merchant.id,
        email: 'admin@hamiltonbeauty.com'
      }
    });
    
    console.log('\nMerchant user:', merchantUser);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStaffRecords();