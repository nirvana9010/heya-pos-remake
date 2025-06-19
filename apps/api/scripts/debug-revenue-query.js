#!/usr/bin/env node

/**
 * Debug revenue query to understand why it returns 0
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugRevenueQuery() {
  try {
    console.log('Debugging revenue query...\n');
    
    // First, let's see what payments exist
    console.log('1. Checking all OrderPayments:');
    const allPayments = await prisma.orderPayment.findMany({
      include: {
        order: true
      },
      take: 10
    });
    
    console.log(`Found ${allPayments.length} payments`);
    allPayments.forEach(payment => {
      console.log(`  - ID: ${payment.id.slice(0, 8)}...`);
      console.log(`    Amount: $${payment.amount}`);
      console.log(`    Status: ${payment.status}`);
      console.log(`    ProcessedAt: ${payment.processedAt}`);
      console.log(`    Order State: ${payment.order?.state || 'No order'}`);
      console.log(`    Order MerchantId: ${payment.order?.merchantId || 'No merchantId'}`);
      console.log('');
    });
    
    // Now let's run the exact query the service uses
    console.log('\n2. Running revenue service query:');
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    
    // Get Hamilton merchant ID
    const merchant = await prisma.merchant.findFirst({
      where: { subdomain: 'hamilton' }
    });
    
    if (!merchant) {
      console.log('ERROR: Hamilton merchant not found!');
      return;
    }
    
    console.log(`Merchant ID: ${merchant.id}`);
    console.log(`Today Start: ${todayStart.toISOString()}`);
    console.log(`Today End: ${todayEnd.toISOString()}`);
    
    // The exact query from the service
    const baseWhere = {
      order: {
        merchantId: merchant.id,
        state: { in: ['PAID', 'COMPLETE'] },
      },
      status: 'COMPLETED',
    };
    
    console.log('\nBase where clause:', JSON.stringify(baseWhere, null, 2));
    
    // Count matching payments
    const matchingPayments = await prisma.orderPayment.findMany({
      where: baseWhere,
      include: {
        order: true
      }
    });
    
    console.log(`\nFound ${matchingPayments.length} matching payments`);
    
    if (matchingPayments.length > 0) {
      console.log('\nSample matching payments:');
      matchingPayments.slice(0, 3).forEach(payment => {
        console.log(`  - Payment ${payment.id.slice(0, 8)}...`);
        console.log(`    Amount: $${payment.amount}`);
        console.log(`    ProcessedAt: ${payment.processedAt}`);
      });
    }
    
    // Try aggregate sum
    const todaySum = await prisma.orderPayment.aggregate({
      where: {
        ...baseWhere,
        processedAt: { gte: todayStart, lte: todayEnd },
      },
      _sum: { amount: true },
    });
    
    console.log(`\nToday's revenue sum: $${todaySum._sum.amount || 0}`);
    
    // Check without date filter
    const totalSum = await prisma.orderPayment.aggregate({
      where: baseWhere,
      _sum: { amount: true },
    });
    
    console.log(`Total revenue (all time): $${totalSum._sum.amount || 0}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugRevenueQuery();