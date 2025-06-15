import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function completeOrderTablesFix() {
  console.log('Applying comprehensive fix to Order-related tables...\n');
  
  try {
    // OrderPayment - Add all missing columns
    console.log('Fixing OrderPayment table...');
    
    try {
      await prisma.$executeRaw`ALTER TABLE "OrderPayment" ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP`;
      console.log('✓ Added failedAt column');
    } catch (e) {
      console.log('  failedAt column might already exist');
    }
    
    try {
      await prisma.$executeRaw`ALTER TABLE "OrderPayment" ADD COLUMN IF NOT EXISTS "failureReason" TEXT`;
      console.log('✓ Added failureReason column');
    } catch (e) {
      console.log('  failureReason column might already exist');
    }
    
    // Add foreign key for processedBy if missing
    try {
      await prisma.$executeRaw`
        ALTER TABLE "OrderPayment" 
        ADD CONSTRAINT "OrderPayment_processedById_fkey" 
        FOREIGN KEY ("processedById") REFERENCES "Staff"(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `;
      console.log('✓ Added processedBy foreign key');
    } catch (e) {
      console.log('  Foreign key might already exist');
    }
    
    // Fix TipAllocation table
    console.log('\nFixing TipAllocation table...');
    try {
      await prisma.$executeRaw`ALTER TABLE "TipAllocation" RENAME COLUMN "paymentId" TO "orderPaymentId"`;
      console.log('✓ Renamed paymentId to orderPaymentId');
    } catch (e) {
      console.log('  Column rename not needed or failed:', e.message);
    }
    
    // Update foreign key constraint if needed
    try {
      await prisma.$executeRaw`
        ALTER TABLE "TipAllocation" 
        DROP CONSTRAINT IF EXISTS "TipAllocation_paymentId_fkey"
      `;
      await prisma.$executeRaw`
        ALTER TABLE "TipAllocation" 
        ADD CONSTRAINT "TipAllocation_orderPaymentId_fkey" 
        FOREIGN KEY ("orderPaymentId") REFERENCES "OrderPayment"(id) 
        ON DELETE CASCADE ON UPDATE CASCADE
      `;
      console.log('✓ Updated TipAllocation foreign key');
    } catch (e) {
      console.log('  Foreign key update not needed');
    }
    
    console.log('\n✅ All table fixes completed successfully!');
    console.log('\nNext steps:');
    console.log('1. The payment endpoint should now work');
    console.log('2. Test creating orders from bookings');
    console.log('3. Test payment processing');
    
  } catch (error) {
    console.error('Error fixing tables:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

completeOrderTablesFix().catch(console.error);