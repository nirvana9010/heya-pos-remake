import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("Adding deletedAt column to Booking table...");

    // Add the deletedAt column
    await prisma.$executeRaw`
      ALTER TABLE "Booking" 
      ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
    `;

    console.log("Creating index on deletedAt...");

    // Create index for efficient queries
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Booking_deletedAt_idx" 
      ON "Booking"("deletedAt");
    `;

    console.log("Creating composite index for deleted bookings...");

    // Create composite index for finding old deleted bookings
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Booking_deletedAt_status_idx" 
      ON "Booking"("deletedAt", "status") 
      WHERE "status" = 'DELETED';
    `;

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
