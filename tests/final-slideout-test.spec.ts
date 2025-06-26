import { test, expect } from '@playwright/test';

test.describe('Final Slideout Test', () => {
  test('Test customer search in calendar slideout with proper detection', async ({ page }) => {
    // Capture ALL console messages
    const consoleLogs: string[] = [];
    
    page.on('console', async msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      
      // Print CustomerSearchInput logs immediately
      if (text.includes('CustomerSearchInput') || 
          text.includes('🔍') || 
          text.includes('❌') || 
          text.includes('✅') ||
          text.includes('⚠️')) {
        console.log(`🖥️ CONSOLE: ${text}`);
      }
    });
    
    // Navigate to calendar
    await page.goto('/calendar');
    
    // Handle login
    if (page.url().includes('/login')) {
      await page.locator('button:has-text("Quick Login as Hamilton")').click();
      await page.waitForURL('**/calendar');
    }
    
    // Wait for calendar to load
    await page.waitForTimeout(2000);
    
    // Click on a time slot
    console.log('🎯 Clicking on time slot...');
    const emptySlot = page.locator('div.cursor-pointer.h-\\[60px\\]:not(:has(*))').first();
    await emptySlot.click();
    console.log('✅ Clicked time slot');
    
    // Wait for the "New Booking" heading to appear (based on screenshot)
    await page.waitForSelector('text="New Booking"', { timeout: 5000 });
    console.log('✅ Booking slideout opened');
    
    // Navigate to Customer step by clicking Next buttons
    console.log('📍 Navigating to Customer step...');
    
    // We're on Date & Time, need to click Next twice
    // First Next: Date & Time -> Service
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    if (await nextButton.isVisible()) {
      console.log('Clicking Next to go to Service step...');
      await nextButton.click();
      await page.waitForTimeout(500);
      
      // Select a service
      console.log('Selecting a service...');
      // Click the service button (not just the text)
      const serviceButton = page.locator('button:has(h4:text("Test new service"))').first();
      await serviceButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Service selected');
      
      // Second Next: Service -> Customer
      console.log('Clicking Next to go to Customer step...');
      await nextButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Should now be on Customer step');
    }
    
    // Now look for the CustomerSearchInput
    console.log('🔍 Looking for CustomerSearchInput...');
    
    // Wait for the customer step content to load
    await page.waitForTimeout(1000);
    
    // Look for the specific placeholder
    const searchInput = await page.locator('input[placeholder="Search customers by name, phone, or email..."]');
    
    if (await searchInput.count() > 0 && await searchInput.isVisible()) {
      console.log('✅ Found CustomerSearchInput!');
      
      // Monitor network requests
      const networkPromise = page.waitForRequest(
        req => req.url().includes('/customers/search'),
        { timeout: 5000 }
      ).catch(() => null);
      
      // Type in the search field
      console.log('📝 Typing "test" in CustomerSearchInput...');
      await searchInput.fill('');
      await searchInput.type('test', { delay: 100 });
      
      console.log('⏳ Waiting for search to execute...');
      await page.waitForTimeout(2000);
      
      // Check if network request was made
      const request = await networkPromise;
      if (request) {
        console.log('✅ API REQUEST MADE!');
        console.log('  URL:', request.url());
        const response = await request.response();
        if (response) {
          console.log('  Status:', response.status());
          const body = await response.text().catch(() => 'Could not read body');
          console.log('  Response preview:', body.substring(0, 200));
        }
      } else {
        console.log('❌ NO API REQUEST DETECTED');
      }
      
      // Check for search dropdown
      const dropdown = await page.locator('.z-50').first();
      if (await dropdown.isVisible()) {
        console.log('✅ Search dropdown visible');
        const resultButtons = await page.locator('.z-50 button').all();
        console.log(`📊 Number of results: ${resultButtons.length}`);
        
        // Print first few results
        for (let i = 0; i < Math.min(3, resultButtons.length); i++) {
          const text = await resultButtons[i].textContent();
          console.log(`  Result ${i + 1}: ${text?.replace(/\s+/g, ' ').trim()}`);
        }
      } else {
        console.log('❌ No search dropdown visible');
      }
      
      // Take screenshot
      await page.screenshot({ path: 'screenshots/customer-search-final.png' });
      
    } else {
      console.log('❌ CustomerSearchInput not found or not visible');
      
      // Debug: List all inputs
      const allInputs = await page.locator('input').all();
      console.log(`📋 Total inputs on page: ${allInputs.length}`);
      
      for (let i = 0; i < Math.min(5, allInputs.length); i++) {
        const attrs = await allInputs[i].evaluate(el => ({
          placeholder: el.getAttribute('placeholder'),
          type: el.getAttribute('type'),
          visible: window.getComputedStyle(el).display !== 'none'
        }));
        console.log(`  Input ${i + 1}:`, JSON.stringify(attrs));
      }
    }
    
    // Print captured console logs
    console.log('\n📋 CUSTOMER SEARCH CONSOLE LOGS:');
    const searchLogs = consoleLogs.filter(log => 
      log.includes('CustomerSearchInput') || 
      log.includes('Customer search') ||
      log.includes('🔍') ||
      log.includes('❌') ||
      log.includes('✅') ||
      log.includes('⚠️')
    );
    
    if (searchLogs.length === 0) {
      console.log('  ⚠️ No CustomerSearchInput console logs captured');
      console.log('  This means the console.log statements in the component are not executing');
    } else {
      searchLogs.forEach(log => console.log('  ', log));
    }
  });
});