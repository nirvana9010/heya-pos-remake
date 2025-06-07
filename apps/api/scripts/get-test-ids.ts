import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getTestIds() {
  console.log('Fetching test IDs from database...\n');

  try {
    // Get merchant
    const merchant = await prisma.merchant.findFirst({
      where: { subdomain: 'hamilton' }
    });
    console.log('Merchant ID:', merchant?.id);

    // Get location
    const location = await prisma.location.findFirst({
      where: { merchantId: merchant?.id }
    });
    console.log('Location ID:', location?.id);

    // Get staff
    const staff = await prisma.staff.findMany({
      where: { merchantId: merchant?.id },
      select: { id: true, firstName: true, lastName: true }
    });
    console.log('\nStaff:');
    staff.forEach(s => console.log(`- ${s.id}: ${s.firstName} ${s.lastName}`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTestIds();