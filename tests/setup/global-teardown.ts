import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright global teardown...');
  
  // Clean up authentication file
  const authFile = path.join(__dirname, '..', 'auth.json');
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
    console.log('🗑️  Cleaned up authentication file');
  }
  
  // Note: We're not cleaning up test data as it might be useful for debugging
  // and the seeding process handles duplicates gracefully
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;