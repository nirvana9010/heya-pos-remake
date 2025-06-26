import { test, expect } from '@playwright/test';

test.describe('Setup Verification', () => {
  test('Basic setup test - verify services are running', async ({ page }) => {
    console.log('🧪 Verifying basic setup...');
    
    // Test if we can reach the merchant app
    try {
      await page.goto('http://localhost:3002');
      console.log('✅ Merchant app is accessible');
    } catch (error) {
      console.log('❌ Merchant app is not accessible:', error);
      throw error;
    }
    
    // Test if we can reach the API
    try {
      const response = await page.goto('http://localhost:3000/api/v1/health');
      expect(response?.status()).toBe(200);
      console.log('✅ API is accessible');
    } catch (error) {
      console.log('❌ API is not accessible:', error);
      throw error;
    }
    
    console.log('✅ Basic setup verification passed');
  });

  test('Authentication test', async ({ page }) => {
    console.log('🧪 Testing authentication flow...');
    
    // Navigate to login page
    await page.goto('http://localhost:3002/login');
    
    // Check if login form is present
    await expect(page.locator('input[name="username"], input[type="text"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    
    // Fill in credentials
    await page.fill('input[name="username"], input[type="text"]', 'HAMILTON');
    await page.fill('input[name="password"], input[type="password"]', 'demo123');
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign")');
    
    // Wait for redirect to calendar
    await page.waitForURL('**/calendar', { timeout: 10000 });
    
    // Verify we're on the calendar page
    const calendarVisible = await page.locator('.calendar-grid, .calendar-container, [data-testid="calendar"]').isVisible();
    expect(calendarVisible).toBe(true);
    
    console.log('✅ Authentication test passed');
  });
});