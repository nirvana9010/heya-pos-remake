import { test, expect } from '@playwright/test';

test.describe('Capture Search Error', () => {
  test('Capture the exact error preventing API calls', async ({ page }) => {
    // Capture ALL console messages
    const consoleLogs: string[] = [];
    
    page.on('console', async msg => {
      // Get the full text with all arguments
      const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => 'Complex object')));
      const fullText = args.join(' ');
      
      consoleLogs.push(`[${msg.type().toUpperCase()}] ${fullText}`);
      
      // Print customer search related logs immediately
      if (fullText.includes('CustomerSearchInput') || 
          fullText.includes('🔍') || 
          fullText.includes('❌') || 
          fullText.includes('✅') ||
          fullText.includes('⚠️')) {
        console.log(`🖥️ CONSOLE: ${fullText}`);
      }
    });
    
    // Also capture page errors
    page.on('pageerror', error => {
      console.log('❌ PAGE ERROR:', error.message);
      consoleLogs.push(`[PAGE ERROR] ${error.message}`);
    });
    
    // Navigate directly to calendar with auth cookie
    console.log('📍 Step 1: Navigate to calendar...');
    const response = await page.goto('/calendar', { waitUntil: 'domcontentloaded' });
    console.log('  Response status:', response?.status());
    
    // If redirected to login, handle it
    if (page.url().includes('/login')) {
      console.log('📍 Step 2: Need to login...');
      
      // Wait for and click quick login
      const quickLogin = page.locator('button:has-text("Quick Login as Hamilton")');
      await quickLogin.waitFor({ state: 'visible', timeout: 5000 });
      await quickLogin.click();
      
      // Wait for navigation to calendar
      await page.waitForURL('**/calendar', { timeout: 10000 });
      console.log('✅ Logged in successfully');
    }
    
    // Wait for calendar to fully load
    console.log('📍 Step 3: Wait for calendar to load...');
    // Wait for any sign the calendar is loaded
    await page.waitForSelector('button:has-text("Today"), button:has-text("New Booking"), [class*="calendar"]', { timeout: 10000 });
    await page.waitForTimeout(2000); // Give React time to render
    
    // Click on a time slot - try multiple strategies
    console.log('📍 Step 4: Click time slot to open booking slideout...');
    
    // Strategy 1: Click by class pattern
    let clicked = false;
    const slot = page.locator('div.cursor-pointer.h-\\[60px\\]').first();
    if (await slot.count() > 0) {
      await slot.click();
      clicked = true;
      console.log('✅ Clicked time slot using class selector');
    }
    
    if (!clicked) {
      // Strategy 2: Click by coordinates in calendar area
      const calendarGrid = page.locator('.overflow-x-auto').first();
      const box = await calendarGrid.boundingBox();
      if (box) {
        await page.mouse.click(box.x + 300, box.y + 100);
        console.log('✅ Clicked in calendar grid area');
      }
    }
    
    // Wait for slideout to appear
    console.log('📍 Step 5: Wait for slideout...');
    await page.waitForTimeout(1000);
    
    // Navigate to customer step - click the Customer tab
    console.log('📍 Step 6: Navigate to customer step...');
    
    // First try clicking the Customer tab directly
    const customerTab = page.locator('button:has-text("Customer"), [role="tab"]:has-text("Customer")').first();
    if (await customerTab.isVisible()) {
      console.log('  Clicking Customer tab...');
      await customerTab.click({ force: true });
      await page.waitForTimeout(500);
    } else {
      // If no tab, try clicking Next buttons
      const nextButton = page.locator('button:has-text("Next")').first();
      if (await nextButton.isVisible()) {
        // Click Next until we get to customer step (max 3 times)
        for (let i = 0; i < 3; i++) {
          if (await nextButton.isVisible()) {
            await nextButton.click();
            await page.waitForTimeout(500);
            
            // Check if we see customer search
            const hasCustomerSearch = await page.locator('input[placeholder*="Search customers"]').count() > 0;
            if (hasCustomerSearch) {
              console.log('✅ Reached customer step');
              break;
            }
          }
        }
      }
    }
    
    // Find and interact with customer search
    console.log('📍 Step 7: Find customer search input...');
    
    // Look for the specific CustomerSearchInput placeholder
    const customerSearchInput = await page.locator('input[placeholder="Search customers by name, phone, or email..."]').first();
    
    if (await customerSearchInput.count() > 0) {
      console.log('✅ Found CustomerSearchInput');
    } else {
      console.log('❌ CustomerSearchInput not found, looking for any search input...');
      // Fallback to any input with "customer" in placeholder
      const searchInputs = await page.locator('input[placeholder*="customer" i]').all();
      console.log(`  Found ${searchInputs.length} inputs with "customer" in placeholder`);
      
      for (const input of searchInputs) {
        const placeholder = await input.getAttribute('placeholder');
        console.log(`  Input placeholder: "${placeholder}"`);
      }
    }
    
    if (customerSearchInput && await customerSearchInput.isVisible()) {
      console.log('📍 Step 8: Type in search field...');
      
      // Clear existing value
      await customerSearchInput.fill('');
      
      // Set up network monitoring BEFORE typing
      const searchRequestPromise = page.waitForRequest(
        request => request.url().includes('/customers/search'),
        { timeout: 3000 }
      ).catch(() => null);
      
      // Type search query
      await customerSearchInput.type('test', { delay: 50 });
      
      console.log('📍 Step 9: Wait for search to execute...');
      await page.waitForTimeout(2000); // Wait for debounce + potential API call
      
      // Check if request was made
      const searchRequest = await searchRequestPromise;
      if (searchRequest) {
        console.log('✅ API REQUEST DETECTED!');
        console.log('  URL:', searchRequest.url());
        console.log('  Method:', searchRequest.method());
        
        const response = await searchRequest.response();
        if (response) {
          console.log('  Response status:', response.status());
          const responseBody = await response.text().catch(() => 'Could not read body');
          console.log('  Response body:', responseBody.substring(0, 200));
        }
      } else {
        console.log('❌ NO API REQUEST MADE');
      }
      
      // Check for results dropdown
      const dropdown = await page.locator('.z-50, [role="listbox"]').first();
      const dropdownVisible = await dropdown.isVisible().catch(() => false);
      console.log('📋 Search dropdown visible:', dropdownVisible);
      
      if (dropdownVisible) {
        const resultCount = await page.locator('.z-50 button, [role="option"]').count();
        console.log('📊 Number of results shown:', resultCount);
      }
      
    } else {
      console.log('❌ Could not find or access customer search input');
    }
    
    // Print all captured console logs
    console.log('\n📋 ALL CAPTURED CONSOLE LOGS:');
    if (consoleLogs.length === 0) {
      console.log('  ⚠️ No console logs captured');
    } else {
      // Filter for relevant logs
      const relevantLogs = consoleLogs.filter(log => 
        log.includes('CustomerSearchInput') ||
        log.includes('Customer search') ||
        log.includes('apiClient') ||
        log.includes('🔍') ||
        log.includes('❌') ||
        log.includes('✅') ||
        log.includes('⚠️') ||
        log.includes('Error') ||
        log.includes('error')
      );
      
      if (relevantLogs.length > 0) {
        console.log('\n  RELEVANT LOGS:');
        relevantLogs.forEach(log => console.log('  ', log));
      } else {
        console.log('  ⚠️ No customer search related logs found');
        console.log('\n  FIRST 10 LOGS:');
        consoleLogs.slice(0, 10).forEach(log => console.log('  ', log));
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: 'screenshots/search-error-final.png', fullPage: true });
    console.log('\n📸 Screenshot saved: search-error-final.png');
    
    // Final state check
    const finalState = await page.evaluate(() => ({
      url: window.location.href,
      hasToken: !!localStorage.getItem('access_token'),
      searchInputsCount: document.querySelectorAll('input[placeholder*="search" i]').length,
      visibleModals: Array.from(document.querySelectorAll('[role="dialog"], .fixed.inset-y-0')).map(el => ({
        visible: window.getComputedStyle(el).display !== 'none',
        classes: el.className
      }))
    }));
    
    console.log('\n📊 Final page state:', JSON.stringify(finalState, null, 2));
  });
});