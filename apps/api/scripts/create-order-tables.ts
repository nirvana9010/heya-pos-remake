import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createOrderTables() {
  console.log('Creating Order-related tables...');
  
  try {
    // Check if Order table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Order'
      );
    `;
    
    if (tableExists[0]?.exists) {
      console.log('Order tables already exist');
      return;
    }
    
    console.log('Creating Order table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Order" (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        "merchantId" VARCHAR(255) NOT NULL,
        "locationId" VARCHAR(255) NOT NULL,
        "customerId" VARCHAR(255),
        "bookingId" VARCHAR(255) UNIQUE,
        "orderNumber" VARCHAR(255) UNIQUE NOT NULL,
        state VARCHAR(255) DEFAULT 'DRAFT' NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        "taxAmount" DECIMAL(10,2) NOT NULL,
        "totalAmount" DECIMAL(10,2) NOT NULL,
        "paidAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
        "balanceDue" DECIMAL(10,2) NOT NULL,
        metadata JSONB,
        "createdById" VARCHAR(255) NOT NULL,
        "lockedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "cancelledAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    
    console.log('Creating OrderItem table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "OrderItem" (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderId" VARCHAR(255) NOT NULL,
        "itemType" VARCHAR(255) NOT NULL,
        "itemId" VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        quantity DECIMAL(10,2) NOT NULL,
        "unitPrice" DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0 NOT NULL,
        "taxRate" DECIMAL(5,4) DEFAULT 0 NOT NULL,
        "taxAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        "staffId" VARCHAR(255),
        metadata JSONB,
        "sortOrder" INTEGER DEFAULT 0 NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    
    console.log('Creating OrderModifier table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "OrderModifier" (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderId" VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        subtype VARCHAR(255),
        calculation VARCHAR(255) NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description VARCHAR(255),
        "appliesTo" TEXT[],
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    
    console.log('Creating OrderPayment table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "OrderPayment" (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        "orderId" VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        "tipAmount" DECIMAL(10,2) DEFAULT 0 NOT NULL,
        method VARCHAR(255) NOT NULL,
        status VARCHAR(255) DEFAULT 'PENDING' NOT NULL,
        reference VARCHAR(255),
        metadata JSONB,
        "processedAt" TIMESTAMP,
        "refundedAmount" DECIMAL(10,2) DEFAULT 0,
        "refundedAt" TIMESTAMP,
        "refundReason" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    
    console.log('Creating TipAllocation table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "TipAllocation" (
        id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid(),
        "paymentId" VARCHAR(255) NOT NULL,
        "staffId" VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        percentage DECIMAL(5,2),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    
    console.log('Adding foreign key constraints...');
    
    // Order foreign keys
    await prisma.$executeRaw`
      ALTER TABLE "Order"
      ADD CONSTRAINT "Order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      ADD CONSTRAINT "Order_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE SET NULL ON UPDATE CASCADE,
      ADD CONSTRAINT "Order_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"(id) ON DELETE SET NULL ON UPDATE CASCADE,
      ADD CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Staff"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
    `;
    
    // OrderItem foreign keys
    await prisma.$executeRaw`
      ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "OrderItem_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"(id) ON DELETE SET NULL ON UPDATE CASCADE;
    `;
    
    // OrderModifier foreign keys
    await prisma.$executeRaw`
      ALTER TABLE "OrderModifier"
      ADD CONSTRAINT "OrderModifier_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    // OrderPayment foreign keys
    await prisma.$executeRaw`
      ALTER TABLE "OrderPayment"
      ADD CONSTRAINT "OrderPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    // TipAllocation foreign keys
    await prisma.$executeRaw`
      ALTER TABLE "TipAllocation"
      ADD CONSTRAINT "TipAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "OrderPayment"(id) ON DELETE CASCADE ON UPDATE CASCADE,
      ADD CONSTRAINT "TipAllocation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"(id) ON DELETE RESTRICT ON UPDATE CASCADE;
    `;
    
    console.log('Creating indexes...');
    
    // Order indexes - execute one at a time
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Order_merchantId_idx" ON "Order"("merchantId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Order_locationId_idx" ON "Order"("locationId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON "Order"("customerId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Order_state_idx" ON "Order"(state)`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Order_orderNumber_idx" ON "Order"("orderNumber")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt")`;
    
    // OrderItem indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "OrderItem_staffId_idx" ON "OrderItem"("staffId")`;
    
    // OrderModifier indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "OrderModifier_orderId_idx" ON "OrderModifier"("orderId")`;
    
    // OrderPayment indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "OrderPayment_orderId_idx" ON "OrderPayment"("orderId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "OrderPayment_status_idx" ON "OrderPayment"(status)`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "OrderPayment_method_idx" ON "OrderPayment"(method)`;
    
    // TipAllocation indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "TipAllocation_paymentId_idx" ON "TipAllocation"("paymentId")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "TipAllocation_staffId_idx" ON "TipAllocation"("staffId")`;
    
    console.log('✅ Order tables created successfully!');
    
  } catch (error) {
    console.error('Error creating Order tables:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createOrderTables().catch(console.error);