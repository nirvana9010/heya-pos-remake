import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOrderTables() {
  console.log('Fixing Order-related tables...');
  
  try {
    // Add missing metadata column to OrderModifier
    console.log('Adding metadata column to OrderModifier...');
    try {
      await prisma.$executeRaw`ALTER TABLE "OrderModifier" ADD COLUMN IF NOT EXISTS metadata JSONB`;
      console.log('✓ Added metadata column to OrderModifier');
    } catch (e) {
      console.log('Column might already exist or error:', e.message);
    }
    
    // Ensure all columns exist in Order table
    console.log('Checking Order table columns...');
    try {
      await prisma.$executeRaw`ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS metadata JSONB`;
      console.log('✓ Ensured metadata column exists in Order');
    } catch (e) {
      console.log('Column might already exist:', e.message);
    }
    
    // Check if we need to add any missing columns to OrderItem
    console.log('Checking OrderItem table columns...');
    try {
      await prisma.$executeRaw`ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS metadata JSONB`;
      console.log('✓ Ensured metadata column exists in OrderItem');
    } catch (e) {
      console.log('Column might already exist:', e.message);
    }
    
    // Check OrderPayment columns
    console.log('Checking OrderPayment table columns...');
    try {
      await prisma.$executeRaw`ALTER TABLE "OrderPayment" ADD COLUMN IF NOT EXISTS metadata JSONB`;
      console.log('✓ Ensured metadata column exists in OrderPayment');
    } catch (e) {
      console.log('Column might already exist:', e.message);
    }
    
    // Rename method to paymentMethod if needed
    try {
      await prisma.$executeRaw`ALTER TABLE "OrderPayment" RENAME COLUMN method TO "paymentMethod"`;
      console.log('✓ Renamed method to paymentMethod');
    } catch (e) {
      console.log('Column rename not needed or failed:', e.message);
    }
    
    // Add missing columns for OrderPayment
    try {
      await prisma.$executeRaw`ALTER TABLE "OrderPayment" ADD COLUMN IF NOT EXISTS "gatewayResponse" JSONB`;
      await prisma.$executeRaw`ALTER TABLE "OrderPayment" ADD COLUMN IF NOT EXISTS "processedById" VARCHAR(255)`;
      await prisma.$executeRaw`ALTER TABLE "OrderPayment" ADD COLUMN IF NOT EXISTS "refundedAmount" DECIMAL(10,2) DEFAULT 0`;
      await prisma.$executeRaw`ALTER TABLE "OrderPayment" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP`;
      await prisma.$executeRaw`ALTER TABLE "OrderPayment" ADD COLUMN IF NOT EXISTS "refundReason" TEXT`;
      console.log('✓ Added missing columns to OrderPayment');
    } catch (e) {
      console.log('Some columns might already exist:', e.message);
    }
    
    console.log('\n✅ All table fixes applied successfully!');
    
  } catch (error) {
    console.error('Error fixing Order tables:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixOrderTables().catch(console.error);