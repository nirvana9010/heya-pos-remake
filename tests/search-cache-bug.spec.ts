import { test, expect } from '@playwright/test';

test.describe('Search Cache Bug', () => {
  test('Reproduce search cache issue - search Lukas, clear, search Test', async ({ page }) => {
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
    
    // Wait for slideout
    await page.waitForSelector('text="New Booking"', { timeout: 5000 });
    console.log('✅ Booking slideout opened');
    
    // Navigate to Customer step by clicking Next twice
    console.log('📍 Navigating to Customer step...');
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    
    // First Next: Date & Time -> Service
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Select a service
    const serviceButton = page.locator('button:has(h4:text("Test new service"))').first();
    await serviceButton.click();
    await page.waitForTimeout(500);
    
    // Second Next: Service -> Customer
    await nextButton.click();
    await page.waitForTimeout(500);
    console.log('✅ On Customer step');
    
    // Find the search input
    const searchInput = page.locator('input[placeholder="Search customers by name, phone, or email..."]');
    
    // FIRST SEARCH: Search for "Lukas"
    console.log('\n🔍 FIRST SEARCH: Searching for "Lukas"...');
    await searchInput.fill('');
    await searchInput.type('Lukas', { delay: 100 });
    await page.waitForTimeout(2000); // Wait for debounce and search
    
    // Wait for dropdown to appear
    await page.waitForTimeout(500);
    
    // Look for the dropdown with customer results
    const dropdown = page.locator('[role="listbox"], .absolute.z-50').filter({ has: page.locator('text=/Lukas/i') });
    const lukasVisible = await dropdown.isVisible();
    console.log(`📊 Lukas dropdown visible: ${lukasVisible}`);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/search-lukas.png' });
    
    // Get customer results specifically
    const customerResults = await page.locator('button[role="option"], button:has(.flex-col)').filter({ hasText: /@|\+/ }).all();
    console.log(`Found ${customerResults.length} customer results`);
    
    if (customerResults.length > 0) {
      console.log('Lukas search results:');
      for (let i = 0; i < Math.min(3, customerResults.length); i++) {
        const text = await customerResults[i].textContent();
        console.log(`  - ${text?.replace(/\\s+/g, ' ').trim()}`);
      }
    }
    
    // CLEAR THE SEARCH
    console.log('\n🧹 Clearing search input...');
    await searchInput.fill('');
    await page.waitForTimeout(1000);
    
    // SECOND SEARCH: Search for "Test"
    console.log('\n🔍 SECOND SEARCH: Searching for "Test"...');
    await searchInput.type('Test', { delay: 100 });
    await page.waitForTimeout(2000); // Wait for debounce and search
    
    // Wait for dropdown to update
    await page.waitForTimeout(500);
    
    // Take screenshot
    await page.screenshot({ path: 'screenshots/search-test-after-lukas.png' });
    
    // Get customer results specifically
    const testCustomerResults = await page.locator('button[role="option"], button:has(.flex-col)').filter({ hasText: /@|\+/ }).all();
    console.log(`📊 Found ${testCustomerResults.length} customer results for "Test"`);
    
    if (testCustomerResults.length > 0) {
      console.log('Test search results:');
      for (let i = 0; i < Math.min(5, testCustomerResults.length); i++) {
        const text = await testCustomerResults[i].textContent();
        console.log(`  - ${text?.replace(/\\s+/g, ' ').trim()}`);
      }
    }
    
    // Check if we're still seeing Lukas results
    const stillHasLukas = await page.locator('button:has-text("Lukas Nguyen")').count() > 0;
    if (stillHasLukas) {
      console.log('\n❌ BUG CONFIRMED: Still showing "Lukas" results when searching for "Test"!');
    } else {
      console.log('\n✅ Search is working correctly - showing "Test" results');
    }
    
    // Final verification
    console.log('\n📋 FINAL VERIFICATION:');
    console.log(`Expected: Results containing "Test"`);
    console.log(`Actual: ${stillHasLukas ? 'Still showing "Lukas" results' : 'Showing correct results'}`);
    
    // Print all search-related console logs
    console.log('\n📋 ALL SEARCH CONSOLE LOGS:');
    const searchLogs = consoleLogs.filter(log => 
      log.includes('CustomerSearchInput') || 
      log.includes('Customer search') ||
      log.includes('🔍') ||
      log.includes('❌') ||
      log.includes('✅') ||
      log.includes('⚠️')
    );
    
    if (searchLogs.length === 0) {
      console.log('  ⚠️ No CustomerSearchInput logs captured');
    } else {
      searchLogs.forEach(log => console.log('  ', log));
    }
  });
});