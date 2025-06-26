import { test, expect } from '@playwright/test';

test.describe('Debug Calendar Search', () => {
  test('Debug customer search functionality', async ({ page }) => {
    const consoleLogs: string[] = [];
    
    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text();
      // Only log customer search related messages
      if (text.includes('CustomerSearchInput') || text.includes('Customer search') || text.includes('❌') || text.includes('✅') || text.includes('⚠️')) {
        console.log(`[${msg.type().toUpperCase()}] ${text}`);
        consoleLogs.push(text);
      }
    });
    
    // Navigate directly to calendar (should use stored auth)
    console.log('🔍 Navigating to calendar...');
    await page.goto('/calendar', { waitUntil: 'networkidle' });
    
    // Check if we were redirected
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    if (currentUrl.includes('/login')) {
      console.log('⚠️ Was redirected to login, attempting quick login...');
      const quickLoginButton = page.locator('button:has-text("Quick Login as Hamilton")');
      if (await quickLoginButton.isVisible({ timeout: 2000 })) {
        await quickLoginButton.click();
        await page.waitForURL('**/calendar', { timeout: 10000 });
        console.log('✅ Logged in successfully');
      }
    }
    
    // Wait for calendar to load
    console.log('⏳ Waiting for calendar to load...');
    await page.waitForTimeout(3000);
    
    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'calendar-loaded.png', fullPage: true });
    console.log('📸 Screenshot saved as calendar-loaded.png');
    
    // Try to find any time slot using various selectors
    const selectors = [
      // Daily view selectors
      'div[class*="h-\\[60px\\]"][class*="cursor-pointer"]',
      'div.cursor-pointer.h-\\[60px\\]',
      // Weekly view selectors  
      'div[class*="min-h-\\[40px\\]"][class*="cursor-pointer"]',
      // General slot selectors
      '[data-calendar-slot]',
      'div[class*="hover\\:bg-gray"]'
    ];
    
    let slotFound = false;
    let slotElement = null;
    
    for (const selector of selectors) {
      const elements = await page.$$(selector);
      console.log(`Selector "${selector}" found ${elements.length} elements`);
      if (elements.length > 0) {
        // Find a visible element
        for (const el of elements) {
          if (await el.isVisible()) {
            slotElement = el;
            slotFound = true;
            console.log(`✅ Found visible slot with selector: ${selector}`);
            break;
          }
        }
        if (slotFound) break;
      }
    }
    
    if (!slotFound) {
      console.log('❌ No time slots found, trying to click in calendar area...');
      // Try clicking in the calendar grid area
      const calendarGrid = await page.$('.overflow-x-auto');
      if (calendarGrid) {
        const box = await calendarGrid.boundingBox();
        if (box) {
          // Click in the middle of the calendar grid
          await page.mouse.click(box.x + box.width / 2, box.y + 100);
          console.log('✅ Clicked in calendar grid area');
        }
      }
    } else {
      // Click the found slot
      await slotElement!.click();
      console.log('✅ Clicked on time slot');
    }
    
    // Wait for slideout
    console.log('⏳ Waiting for booking slideout...');
    try {
      await page.waitForSelector('input[placeholder*="Search customers"]', { timeout: 5000 });
      console.log('✅ Booking slideout opened with customer search');
      
      // Type in the search field
      const searchInput = await page.$('input[placeholder*="Search customers"]');
      if (searchInput) {
        console.log('📝 Typing "test" in search field...');
        await searchInput.fill('test');
        
        // Wait for search to execute
        console.log('⏳ Waiting for search results...');
        await page.waitForTimeout(2000);
        
        // Check network tab
        const searchRequests = await page.evaluate(() => {
          // @ts-ignore
          const entries = performance.getEntriesByType('resource');
          return entries.filter(e => e.name.includes('/customers/search')).map(e => ({
            url: e.name,
            duration: e.duration
          }));
        });
        
        console.log('🌐 Search API requests:', searchRequests.length > 0 ? searchRequests : 'NONE');
        
        // Take screenshot of search results
        await page.screenshot({ path: 'search-results.png', fullPage: true });
        console.log('📸 Screenshot saved as search-results.png');
      }
    } catch (e) {
      console.log('❌ Booking slideout did not open or no search input found');
      
      // Take a screenshot to see current state
      await page.screenshot({ path: 'no-slideout.png', fullPage: true });
      console.log('📸 Screenshot saved as no-slideout.png');
    }
    
    // Print all captured console logs
    if (consoleLogs.length > 0) {
      console.log('\n📋 Customer Search Console Logs:');
      consoleLogs.forEach(log => console.log('  ', log));
    } else {
      console.log('\n⚠️ No customer search console logs captured');
    }
  });
});