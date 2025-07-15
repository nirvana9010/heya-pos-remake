import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const merchant = await prisma.merchant.findFirst({
    where: { email: 'admin@hamiltonbeauty.com' },
    include: { locations: true }
  });

  if (!merchant) {
    console.error('Merchant not found');
    return;
  }

  console.log('Found merchant:', merchant.name);
  console.log('Locations:', merchant.locations.length);

  // Check if auth already exists
  const existingAuth = await prisma.merchantAuth.findUnique({
    where: { merchantId: merchant.id }
  });

  if (existingAuth) {
    console.log('Auth already exists, updating password...');
    const hashedPassword = await bcrypt.hash('test123', 10);
    await prisma.merchantAuth.update({
      where: { merchantId: merchant.id },
      data: { passwordHash: hashedPassword }
    });
  } else {
    console.log('Creating new auth...');
    const hashedPassword = await bcrypt.hash('test123', 10);
    await prisma.merchantAuth.create({
      data: {
        merchantId: merchant.id,
        username: merchant.email,
        passwordHash: hashedPassword
      }
    });
  }

  console.log('Done! You can now login with:');
  console.log('Email:', merchant.email);
  console.log('Password: test123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });