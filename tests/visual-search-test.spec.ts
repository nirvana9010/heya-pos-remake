import { test, expect } from '@playwright/test';

test.describe('Visual Search Test', () => {
  test('Visual debugging of customer search', async ({ page }) => {
    // Slow down actions so we can see what's happening
    test.setTimeout(60000); // 1 minute timeout
    
    // Enable all console logging
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    
    // Navigate to calendar
    console.log('🔍 Navigating to calendar...');
    await page.goto('/calendar');
    
    // Handle login if needed
    if (page.url().includes('/login')) {
      console.log('📝 Need to login first...');
      const quickLoginButton = page.locator('button:has-text("Quick Login as Hamilton")');
      if (await quickLoginButton.isVisible({ timeout: 2000 })) {
        await quickLoginButton.click();
        await page.waitForURL('**/calendar', { timeout: 10000 });
        console.log('✅ Logged in');
      }
    }
    
    // Wait for calendar to fully load
    console.log('⏳ Waiting for calendar to load...');
    await page.waitForTimeout(3000);
    
    // Debug: Check what's on the page
    const pageContent = await page.evaluate(() => {
      // Find all clickable elements
      const clickables = Array.from(document.querySelectorAll('*')).filter(el => {
        const computed = window.getComputedStyle(el);
        return computed.cursor === 'pointer' && el.clientHeight > 20;
      });
      
      return {
        title: document.title,
        hasCalendar: !!document.querySelector('[class*="calendar"]'),
        clickableCount: clickables.length,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean)
      };
    });
    
    console.log('📊 Page analysis:', JSON.stringify(pageContent, null, 2));
    
    // Try different ways to open booking slideout
    console.log('\n🎯 Attempting to open booking slideout...');
    
    // Method 1: Click a specific time slot
    const timeSlots = await page.locator('div[class*="cursor-pointer"][class*="hover\\:bg-gray"]').all();
    console.log(`Found ${timeSlots.length} potential time slots`);
    
    if (timeSlots.length > 0) {
      console.log('Clicking first time slot...');
      await timeSlots[0].click();
      await page.waitForTimeout(1000);
    }
    
    // Check if slideout opened
    let slideoutVisible = await page.locator('.fixed.inset-y-0.right-0').isVisible().catch(() => false);
    
    if (!slideoutVisible) {
      // Method 2: Try clicking in the calendar grid area
      console.log('Slideout not visible, trying to click in calendar grid...');
      
      const calendarGrid = await page.locator('.overflow-x-auto').first();
      if (calendarGrid) {
        const box = await calendarGrid.boundingBox();
        if (box) {
          // Click in multiple spots
          const positions = [
            { x: box.x + 200, y: box.y + 100 },
            { x: box.x + 400, y: box.y + 200 },
            { x: box.x + 600, y: box.y + 150 }
          ];
          
          for (const pos of positions) {
            console.log(`Clicking at (${pos.x}, ${pos.y})...`);
            await page.mouse.click(pos.x, pos.y);
            await page.waitForTimeout(500);
            
            slideoutVisible = await page.locator('.fixed.inset-y-0.right-0').isVisible().catch(() => false);
            if (slideoutVisible) break;
          }
        }
      }
    }
    
    // Take screenshot of current state
    await page.screenshot({ path: 'screenshots/calendar-click-attempt.png', fullPage: true });
    console.log('📸 Screenshot saved: calendar-click-attempt.png');
    
    if (slideoutVisible) {
      console.log('✅ Slideout is visible!');
      
      // Find the customer search input
      const searchInputs = await page.locator('input[placeholder*="search" i]').all();
      console.log(`Found ${searchInputs.length} search inputs`);
      
      for (let i = 0; i < searchInputs.length; i++) {
        const placeholder = await searchInputs[i].getAttribute('placeholder');
        console.log(`  Input ${i + 1}: "${placeholder}"`);
      }
      
      // Find the correct one (should contain "customer")
      const customerInput = await page.locator('input[placeholder*="customer" i]').first();
      if (await customerInput.isVisible()) {
        console.log('✅ Found customer search input');
        
        // Type slowly so we can see what happens
        await customerInput.fill('');
        await customerInput.type('test', { delay: 200 });
        
        console.log('⏳ Waiting for search results...');
        await page.waitForTimeout(2000);
        
        // Take screenshot of search results
        await page.screenshot({ path: 'screenshots/search-results-visible.png', fullPage: true });
        console.log('📸 Screenshot saved: search-results-visible.png');
      }
    } else {
      console.log('❌ Could not open booking slideout');
      
      // Check if there's an error or different UI state
      const errorMessage = await page.locator('[class*="error"], [class*="Error"]').first().textContent().catch(() => null);
      if (errorMessage) {
        console.log('❌ Error found:', errorMessage);
      }
    }
    
    console.log('\n✅ Test complete - check screenshots in the screenshots folder');
  });
});