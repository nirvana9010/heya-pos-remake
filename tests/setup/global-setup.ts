import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...');
  
  // Wait for services to be ready
  await waitForServices();
  
  // Set up authentication
  await setupAuthentication(config);
  
  // Seed test data
  await seedTestData();
  
  console.log('✅ Global setup completed');
}

async function waitForServices() {
  console.log('⏳ Waiting for services to be ready...');
  
  const maxRetries = 30;
  const retryDelay = 2000;
  
  // Wait for API
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:3000/api/v1/health');
      if (response.ok) {
        console.log('✅ API service is ready');
        break;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error('API service failed to start');
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // Wait for merchant app
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:3002');
      if (response.ok) {
        console.log('✅ Merchant app is ready');
        break;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error('Merchant app failed to start');
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

async function setupAuthentication(config: FullConfig) {
  console.log('🔐 Setting up authentication...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navigate to login page
    await page.goto('http://localhost:3002/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // First, try the Quick Login button if available
    const quickLoginButton = page.locator('button:has-text("Quick Login as Hamilton")');
    if (await quickLoginButton.isVisible({ timeout: 2000 })) {
      console.log('Found Quick Login button - using that instead');
      await quickLoginButton.click();
    } else {
      // Fall back to manual form filling
      console.log('No Quick Login button found, using manual form');
      
      // The form expects email field, not username
      const emailField = page.locator('input[name="email"]').first();
      const passwordField = page.locator('input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"]').first();
      
      if (!(await emailField.isVisible({ timeout: 2000 }))) {
        throw new Error('Could not find email input field');
      }
      
      if (!(await passwordField.isVisible({ timeout: 2000 }))) {
        throw new Error('Could not find password input field');
      }
      
      if (!(await submitButton.isVisible({ timeout: 2000 }))) {
        throw new Error('Could not find submit button');
      }
      
      // Try using an email format for HAMILTON user
      // We need to check what email format the system expects
      await emailField.fill('hamilton@example.com');
      await passwordField.fill('demo123');
      await submitButton.click();
    }
    
    // Wait for navigation and check where we ended up
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (e) {
      // Continue even if networkidle times out
    }
    
    // Wait a bit more for redirect
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}`);
    
    // Check if we're on calendar page or need to navigate there
    if (!currentUrl.includes('/calendar')) {
      console.log('Not on calendar page, trying to navigate there...');
      try {
        await page.goto('http://localhost:3002/calendar');
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (e) {
        console.log('Navigation to calendar failed, but continuing...');
      }
    }
    
    // Save authentication state
    const storageState = await context.storageState();
    const authFile = path.join(__dirname, '..', 'auth.json');
    fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));
    
    console.log('✅ Authentication setup completed');
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    
    // Take a screenshot for debugging
    try {
      await page.screenshot({ path: 'login-debug.png', fullPage: true });
      console.log('📸 Screenshot saved as login-debug.png');
    } catch (screenshotError) {
      console.log('Could not take screenshot:', screenshotError);
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

async function seedTestData() {
  console.log('🌱 Seeding test data...');
  
  try {
    // First, authenticate to get a token
    const loginResponse = await fetch('http://localhost:3000/api/v1/auth/merchant/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'HAMILTON',
        password: 'demo123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error('Failed to authenticate for data seeding');
    }
    
    const { token } = await loginResponse.json();
    
    // Define test customers for consistent testing
    const testCustomers = [
      {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test.customer@example.com',
        phone: '0400123456',
        mobile: '0400123456'
      },
      {
        firstName: 'John',
        lastName: 'TestUser',
        email: 'john.testuser@example.com',
        phone: '0400234567',
        mobile: '0400234567'
      },
      {
        firstName: 'Jane',
        lastName: 'TestMember',
        email: 'jane.testmember@example.com',
        phone: '0400345678',
        mobile: '0400345678'
      },
      {
        firstName: 'Search',
        lastName: 'TestCase',
        email: 'search.testcase@example.com',
        phone: '0400456789',
        mobile: '0400456789'
      }
    ];
    
    // Create test customers (skip if they already exist)
    for (const customer of testCustomers) {
      try {
        await fetch('http://localhost:3000/api/v1/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(customer)
        });
      } catch (error) {
        // Customer might already exist, continue
        console.log(`Customer ${customer.firstName} ${customer.lastName} might already exist`);
      }
    }
    
    console.log('✅ Test data seeding completed');
  } catch (error) {
    console.error('❌ Test data seeding failed:', error);
    // Don't throw - tests can still run with existing data
  }
}

export default globalSetup;