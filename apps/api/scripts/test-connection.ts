import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('Testing database connections...\n');

  // Test direct connection
  console.log('Testing DIRECT connection:');
  const prismaDirect = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL
      }
    }
  });

  try {
    await prismaDirect.$connect();
    console.log('✅ Direct connection successful');
    
    // Check if tables exist
    const tables = await prismaDirect.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('Tables found:', tables);
    
    await prismaDirect.$disconnect();
  } catch (error) {
    console.error('❌ Direct connection failed:', error);
  }

  console.log('\nTesting POOLED connection:');
  const prismaPooled = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    await prismaPooled.$connect();
    console.log('✅ Pooled connection successful');
    await prismaPooled.$disconnect();
  } catch (error) {
    console.error('❌ Pooled connection failed:', error);
  }
}

testConnection();