import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function fixStaffSchedule() {
  try {
    console.log('Checking StaffSchedule table structure...');
    
    // Check if locationId column exists
    const columnCheck = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_name = 'StaffSchedule'
      AND column_name = 'locationId'
    `;
    
    console.log('LocationId column info:', columnCheck);
    
    if (columnCheck[0]) {
      console.log('Found locationId column, making it nullable...');
      
      // Make locationId nullable
      await prisma.$executeRaw`
        ALTER TABLE "StaffSchedule" 
        ALTER COLUMN "locationId" DROP NOT NULL
      `;
      
      console.log('Successfully made locationId nullable');
      
      // Add comment
      await prisma.$executeRaw`
        COMMENT ON COLUMN "StaffSchedule"."locationId" IS 'DEPRECATED - Location support removed. This column is no longer used.'
      `;
      
      console.log('Added deprecation comment');
    } else {
      console.log('No locationId column found in StaffSchedule table');
    }
    
    // Check table structure after fix
    const tableStructure = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'StaffSchedule'
      ORDER BY ordinal_position
    `;
    
    console.log('\nCurrent StaffSchedule table structure:');
    console.table(tableStructure);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixStaffSchedule();