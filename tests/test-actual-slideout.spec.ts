import { test, expect } from '@playwright/test';

test.describe('Test Actual Calendar Slideout', () => {
  test('Test customer search in the actual calendar slideout', async ({ page }) => {
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
    
    // Click on a time slot in the calendar grid
    console.log('🎯 Clicking on a time slot in calendar...');
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'screenshots/calendar-before-click.png' });
    
    // Find a clickable time slot - try different selectors
    let clicked = false;
    
    // Strategy 1: Click empty time slot
    const emptySlots = page.locator('div.cursor-pointer.h-\\[60px\\]:not(:has(*))');
    if (await emptySlots.count() > 0) {
      console.log(`Found ${await emptySlots.count()} empty time slots`);
      await emptySlots.first().click();
      clicked = true;
      console.log('✅ Clicked empty time slot');
    }
    
    // Strategy 2: Click any cursor-pointer element
    if (!clicked) {
      const timeSlot = page.locator('div.cursor-pointer.h-\\[60px\\]').first();
      if (await timeSlot.count() > 0) {
        await timeSlot.click();
        clicked = true;
        console.log('✅ Clicked time slot');
      }
    }
    
    if (clicked) {
      // Take screenshot after clicking
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'screenshots/calendar-after-click.png' });
      
      // Wait for slideout to appear - try multiple selectors
      let slideout = null;
      try {
        slideout = await page.waitForSelector('.fixed.inset-y-0.right-0, [data-state="open"], [role="dialog"]', {
          timeout: 5000,
          state: 'visible'
        });
        console.log('✅ Slideout appeared');
      } catch (e) {
        console.log('❌ Slideout did not appear within 5 seconds');
      }
      
      if (slideout) {
        // Take screenshot of initial state
        await page.screenshot({ path: 'screenshots/slideout-initial.png' });
        
        // Check which step we're on
        const steps = ['Date & Time', 'Service', 'Customer', 'Confirm'];
        let currentStep = null;
        
        for (const step of steps) {
          const isActive = await page.locator(`button:has-text("${step}").bg-teal-100`).count() > 0;
          if (isActive) {
            currentStep = step;
            console.log(`📍 Current step: ${step}`);
            break;
          }
        }
        
        // Navigate to Customer step
        if (currentStep !== 'Customer') {
          console.log('📍 Navigating to Customer step...');
          
          // Click Customer tab directly
          const customerTab = page.locator('button:has-text("Customer")').first();
          if (await customerTab.isVisible()) {
            await customerTab.click({ force: true });
            await page.waitForTimeout(500);
            console.log('✅ Clicked Customer tab');
          }
        }
        
        // Now look for the CustomerSearchInput
        console.log('🔍 Looking for CustomerSearchInput...');
        
        // Look for the specific placeholder
        const searchInput = page.locator('input[placeholder="Search customers by name, phone, or email..."]');
        
        if (await searchInput.count() > 0) {
          console.log('✅ Found CustomerSearchInput!');
          
          // Check if it's visible
          const isVisible = await searchInput.isVisible();
          console.log('📋 Input visible:', isVisible);
          
          if (isVisible) {
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
              }
            } else {
              console.log('❌ NO API REQUEST DETECTED');
            }
            
            // Check for search dropdown
            const dropdown = page.locator('.z-50');
            if (await dropdown.isVisible()) {
              console.log('✅ Search dropdown visible');
              const resultCount = await page.locator('.z-50 button').count();
              console.log(`📊 Number of results: ${resultCount}`);
            } else {
              console.log('❌ No search dropdown visible');
            }
            
            // Take screenshot of search state
            await page.screenshot({ path: 'screenshots/slideout-search.png' });
          }
        } else {
          console.log('❌ CustomerSearchInput not found');
          
          // List all inputs in the slideout
          const allInputs = await page.locator('.fixed.inset-y-0.right-0 input').all();
          console.log(`📋 Found ${allInputs.length} inputs in slideout:`);
          
          for (let i = 0; i < allInputs.length; i++) {
            const placeholder = await allInputs[i].getAttribute('placeholder');
            const type = await allInputs[i].getAttribute('type');
            console.log(`  Input ${i + 1}: type="${type}" placeholder="${placeholder}"`);
          }
        }
      } else {
        console.log('❌ Slideout did not appear');
      }
    } else {
      console.log('❌ No time slots found');
    }
    
    // Print captured console logs
    console.log('\n📋 CAPTURED CONSOLE LOGS:');
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