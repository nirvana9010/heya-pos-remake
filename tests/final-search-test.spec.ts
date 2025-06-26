import { test, expect } from '@playwright/test';

test.describe('Final Customer Search Test', () => {
  test('Reproduce and debug customer search issue', async ({ page }) => {
    // Capture ALL console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      // Print important messages immediately
      if (text.includes('🔍') || text.includes('✅') || text.includes('❌') || text.includes('⚠️')) {
        console.log(`🖥️ ${text}`);
      }
    });
    
    // Navigate to calendar
    console.log('📍 Navigating to calendar...');
    await page.goto('/calendar');
    
    // Login if needed
    if (page.url().includes('/login')) {
      const quickLoginButton = page.locator('button:has-text("Quick Login as Hamilton")');
      if (await quickLoginButton.isVisible({ timeout: 2000 })) {
        await quickLoginButton.click();
        await page.waitForURL('**/calendar');
      }
    }
    
    // Wait for calendar to load
    await page.waitForTimeout(2000);
    
    console.log('📍 Current URL:', page.url());
    
    // Click on a time slot
    console.log('🎯 Clicking on time slot...');
    const timeSlot = await page.locator('div[class*="cursor-pointer"][class*="h-\\[60px\\]"]').first();
    await timeSlot.click();
    
    // Wait for slideout
    console.log('⏳ Waiting for slideout...');
    await page.waitForTimeout(1000);
    
    // Check if slideout is open by looking for the customer step
    const customerStep = await page.locator('text="Customer"').isVisible();
    console.log('📋 Customer step visible:', customerStep);
    
    // If not on customer step, navigate to it
    if (!customerStep) {
      // Click Next buttons to get to customer step
      const nextButton = await page.locator('button:has-text("Next")');
      if (await nextButton.isVisible()) {
        console.log('📍 Clicking Next to get to customer step...');
        await nextButton.click();
        await page.waitForTimeout(500);
        
        // Click again if needed
        if (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
    
    // Now look for the customer search input
    const searchInput = await page.locator('input[placeholder*="Search customers"]').first();
    if (await searchInput.isVisible()) {
      console.log('✅ Found customer search input');
      
      // Clear and type
      await searchInput.fill('');
      
      // Monitor network
      const networkPromise = page.waitForRequest(
        req => req.url().includes('/customers/search'),
        { timeout: 5000 }
      ).catch(() => null);
      
      console.log('📝 Typing "test" in search field...');
      await searchInput.type('test', { delay: 100 });
      
      console.log('⏳ Waiting for search to execute...');
      await page.waitForTimeout(2000);
      
      // Check if API request was made
      const request = await networkPromise;
      if (request) {
        console.log('✅ API REQUEST MADE:', request.url());
        const response = await request.response();
        if (response) {
          console.log('  Status:', response.status());
        }
      } else {
        console.log('❌ NO API REQUEST DETECTED');
      }
      
      // Check for dropdown
      const dropdown = await page.locator('.z-50').isVisible();
      console.log('📋 Dropdown visible:', dropdown);
      
      // Count results
      if (dropdown) {
        const results = await page.locator('.z-50 button').count();
        console.log('📊 Number of results:', results);
      }
      
    } else {
      console.log('❌ Customer search input not found');
    }
    
    // Print console logs that contain our debug messages
    console.log('\n📋 CUSTOMER SEARCH CONSOLE LOGS:');
    const searchLogs = consoleLogs.filter(log => 
      log.includes('CustomerSearchInput') || 
      log.includes('Customer search') ||
      log.includes('🔍') ||
      log.includes('✅') ||
      log.includes('❌') ||
      log.includes('⚠️')
    );
    
    if (searchLogs.length === 0) {
      console.log('  ⚠️ No customer search logs captured - the console.log statements may not be executing');
    } else {
      searchLogs.forEach(log => console.log('  ', log));
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'screenshots/final-search-state.png', fullPage: true });
    console.log('\n📸 Screenshot saved: final-search-state.png');
  });
});