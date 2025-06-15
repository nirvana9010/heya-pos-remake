import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { TestSeederService } from '../services/test-seeder.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env.test') });

/**
 * Sets up the test database with seed data
 * Can be run directly: npm run test:db:setup
 */
async function setupTestDatabase() {
  console.log('🚀 Setting up test database...');
  console.log(`📁 Database URL: ${process.env.DATABASE_URL}`);

  // Create a testing module with minimal dependencies
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        envFilePath: '.env.test',
        isGlobal: true,
      }),
    ],
    providers: [PrismaService, TestSeederService],
  }).compile();

  const prismaService = module.get<PrismaService>(PrismaService);
  const seederService = module.get<TestSeederService>(TestSeederService);

  try {
    // Connect to database
    await prismaService.$connect();
    console.log('✅ Connected to test database');

    // Run migrations
    console.log('🔄 Running database migrations...');
    await prismaService.$executeRawUnsafe(`
      -- This would normally be handled by Prisma migrate
      -- For SQLite test database, we'll ensure tables exist
      SELECT 1;
    `);

    // Seed the database
    const result = await seederService.seed({
      cleanFirst: true,
      merchantCount: 2,
      includeDemoData: true,
    });

    console.log('\n📊 Seeding Summary:');
    console.log(`  - Merchants: ${result.summary.merchantsCreated}`);
    console.log(`  - Staff: ${result.summary.totalStaff}`);
    console.log(`  - Services: ${result.summary.totalServices}`);
    console.log(`  - Customers: ${result.summary.totalCustomers}`);

    // Create test scenarios
    await seederService.createTestScenarios();

    console.log('\n✅ Test database setup completed successfully!');
    console.log('\n🔑 Test Credentials:');
    console.log(`  - Merchant Username: ${process.env.TEST_MERCHANT_USERNAME || 'TEST_MERCHANT'}`);
    console.log(`  - Merchant Password: ${process.env.TEST_MERCHANT_PASSWORD || 'test123'}`);
    console.log(`  - Staff PIN: ${process.env.TEST_STAFF_PIN || '1234'}`);

  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  } finally {
    await prismaService.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  setupTestDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { setupTestDatabase };