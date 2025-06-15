import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables before anything else
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  console.log('🧪 Running integration tests with test database');
});

// Global test teardown
afterAll(async () => {
  // Give time for connections to close
  await new Promise(resolve => setTimeout(resolve, 500));
});