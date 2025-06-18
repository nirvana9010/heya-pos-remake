import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌟 Creating VIP customers...');

  // Get the Hamilton merchant
  const merchant = await prisma.merchant.findFirst({
    where: { subdomain: 'hamilton' }
  });

  if (!merchant) {
    throw new Error('Hamilton merchant not found. Please run the main seed first.');
  }

  // Create VIP customers with high spending
  const vipCustomers = [
    {
      merchantId: merchant.id,
      email: 'elizabeth.platinum@email.com',
      firstName: 'Elizabeth',
      lastName: 'Platinum',
      mobile: '+61 400 111 222',
      gender: 'FEMALE',
      address: '1 Harbourside Drive',
      suburb: 'Sydney',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      marketingConsent: true,
      notes: 'VIP client - prefers premium treatments',
      tags: ['vip', 'premium'],
      totalSpent: 5280.00, // Well over $1000
      visitCount: 24,
      lifetimeVisits: 24,
      loyaltyPoints: 5280,
      loyaltyVisits: 24,
    },
    {
      merchantId: merchant.id,
      email: 'victoria.gold@email.com',
      firstName: 'Victoria',
      lastName: 'Gold',
      mobile: '+61 400 333 444',
      gender: 'FEMALE',
      address: '50 Park Street',
      suburb: 'Double Bay',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2028',
      marketingConsent: true,
      notes: 'Regular weekly appointments',
      tags: ['vip', 'regular'],
      totalSpent: 3450.00, // Over $1000
      visitCount: 18,
      lifetimeVisits: 18,
      loyaltyPoints: 3450,
      loyaltyVisits: 18,
    },
    {
      merchantId: merchant.id,
      email: 'sophia.diamond@email.com',
      firstName: 'Sophia',
      lastName: 'Diamond',
      mobile: '+61 400 555 666',
      gender: 'FEMALE',
      address: '100 New South Head Road',
      suburb: 'Vaucluse',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2030',
      marketingConsent: true,
      notes: 'Frequent visitor - loves spa packages',
      tags: ['vip', 'spa-lover'],
      totalSpent: 890.00, // Under $1000 but...
      visitCount: 15, // Over 10 visits (qualifies as VIP)
      lifetimeVisits: 15,
      loyaltyPoints: 890,
      loyaltyVisits: 15,
    },
    {
      merchantId: merchant.id,
      email: 'isabella.crown@email.com',
      firstName: 'Isabella',
      lastName: 'Crown',
      mobile: '+61 400 777 888',
      gender: 'FEMALE',
      address: '200 Military Road',
      suburb: 'Mosman',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2088',
      marketingConsent: true,
      notes: 'Executive package subscriber',
      tags: ['vip', 'executive'],
      totalSpent: 2100.00, // Over $1000
      visitCount: 12, // Also over 10 visits
      lifetimeVisits: 12,
      loyaltyPoints: 2100,
      loyaltyVisits: 12,
    },
    {
      merchantId: merchant.id,
      email: 'charlotte.royal@email.com',
      firstName: 'Charlotte',
      lastName: 'Royal',
      mobile: '+61 400 999 000',
      gender: 'FEMALE',
      address: '15 Macquarie Street',
      suburb: 'Sydney',
      city: 'Sydney',
      state: 'NSW',
      postalCode: '2000',
      marketingConsent: true,
      notes: 'Birthday month special treatments',
      tags: ['vip', 'birthday-specials'],
      totalSpent: 1250.00, // Over $1000
      visitCount: 8,
      lifetimeVisits: 8,
      loyaltyPoints: 1250,
      loyaltyVisits: 8,
    }
  ];

  // Create the VIP customers
  for (const customerData of vipCustomers) {
    const customer = await prisma.customer.upsert({
      where: { 
        merchantId_email: {
          merchantId: merchant.id,
          email: customerData.email
        }
      },
      update: customerData,
      create: customerData,
    });
    
    console.log(`✅ Created VIP customer: ${customer.firstName} ${customer.lastName} - $${customer.totalSpent} spent, ${customer.visitCount} visits`);
  }

  // Also create some non-VIP customers for comparison
  const regularCustomers = [
    {
      merchantId: merchant.id,
      email: 'alice.regular@email.com',
      firstName: 'Alice',
      lastName: 'Regular',
      mobile: '+61 411 111 111',
      gender: 'FEMALE',
      marketingConsent: true,
      totalSpent: 150.00,
      visitCount: 2,
      lifetimeVisits: 2,
      loyaltyPoints: 150,
      loyaltyVisits: 2,
    },
    {
      merchantId: merchant.id,
      email: 'emma.newbie@email.com',
      firstName: 'Emma',
      lastName: 'Newbie',
      mobile: '+61 411 222 333',
      gender: 'FEMALE',
      marketingConsent: false,
      totalSpent: 0,
      visitCount: 0,
      lifetimeVisits: 0,
      loyaltyPoints: 0,
      loyaltyVisits: 0,
    },
    {
      merchantId: merchant.id,
      email: 'sarah.fresh@email.com',
      firstName: 'Sarah',
      lastName: 'Fresh',
      mobile: '+61 411 444 555',
      gender: 'FEMALE',
      marketingConsent: true,
      totalSpent: 0,
      visitCount: 0,
      lifetimeVisits: 0,
      loyaltyPoints: 0,
      loyaltyVisits: 0,
      createdAt: new Date(), // Created today - will show "New" badge
    },
    {
      merchantId: merchant.id,
      email: 'olivia.justjoined@email.com',
      firstName: 'Olivia',
      lastName: 'Justjoined',
      mobile: '+61 411 666 777',
      gender: 'FEMALE',
      marketingConsent: true,
      totalSpent: 75,
      visitCount: 1,
      lifetimeVisits: 1,
      loyaltyPoints: 75,
      loyaltyVisits: 1,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Created 2 days ago
    }
  ];

  for (const customerData of regularCustomers) {
    const customer = await prisma.customer.upsert({
      where: { 
        merchantId_email: {
          merchantId: merchant.id,
          email: customerData.email
        }
      },
      update: customerData,
      create: customerData,
    });
    
    console.log(`✅ Created regular customer: ${customer.firstName} ${customer.lastName}`);
  }

  console.log('\n🎉 VIP customers created successfully!');
  console.log('VIP Criteria: Total spent > $1000 OR Total visits > 10');
}

main()
  .catch((e) => {
    console.error('Error seeding VIP customers:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });