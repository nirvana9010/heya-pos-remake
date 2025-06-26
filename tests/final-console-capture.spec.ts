import { test, expect } from '@playwright/test';

test.describe('Final Console Capture', () => {
  test('Capture console logs showing why search fails', async ({ page }) => {
    // Set up comprehensive console logging
    const allLogs: string[] = [];
    
    page.on('console', async msg => {
      try {
        const args = await Promise.all(
          msg.args().map(arg => 
            arg.jsonValue().catch(() => arg.toString())
          )
        );
        const text = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        allLogs.push(`[${msg.type().toUpperCase()}] ${text}`);
        
        // Print search-related logs immediately
        if (text.includes('CustomerSearchInput') || 
            text.includes('🔍') || 
            text.includes('❌') || 
            text.includes('✅') ||
            text.includes('⚠️') ||
            text.includes('search')) {
          console.log(`🖥️ ${text}`);
        }
      } catch (e) {
        allLogs.push(`[${msg.type().toUpperCase()}] [Could not parse]`);
      }
    });
    
    // Navigate to calendar
    await page.goto('/calendar');
    
    // Handle login
    if (page.url().includes('/login')) {
      await page.locator('button:has-text("Quick Login as Hamilton")').click();
      await page.waitForURL('**/calendar');
    }
    
    await page.waitForTimeout(3000);
    
    // Try a different approach - use the "New Booking" button
    console.log('🎯 Looking for New Booking button...');
    const newBookingButton = page.locator('button:has-text("New Booking")').first();
    
    if (await newBookingButton.isVisible()) {
      console.log('✅ Found New Booking button, clicking...');
      await newBookingButton.click();
      await page.waitForTimeout(1000);
      
      // Now we should be in the booking slideout
      // Click through to customer step
      console.log('📍 Navigating to customer step...');
      
      // Click Next twice (skip Date/Time and Service)
      for (let i = 0; i < 2; i++) {
        const nextBtn = page.locator('button:has-text("Next")');
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(500);
        }
      }
      
      // Now we should be on customer step
      console.log('🔍 Looking for customer search...');
      
      // Take a screenshot to see current state
      await page.screenshot({ path: 'screenshots/customer-step.png' });
      
      // Look for ANY input field in the slideout
      const slideoutInputs = await page.locator('.fixed.inset-y-0.right-0 input, [data-state="open"] input').all();
      console.log(`📋 Found ${slideoutInputs.length} inputs in slideout`);
      
      for (let i = 0; i < slideoutInputs.length; i++) {
        const input = slideoutInputs[i];
        const attrs = await input.evaluate(el => ({
          placeholder: el.getAttribute('placeholder'),
          type: el.getAttribute('type'),
          name: el.getAttribute('name'),
          id: el.getAttribute('id'),
          className: el.className,
          visible: window.getComputedStyle(el).display !== 'none'
        }));
        console.log(`  Input ${i + 1}:`, JSON.stringify(attrs, null, 2));
        
        // If this looks like a search input, try typing in it
        if (attrs.placeholder && 
            (attrs.placeholder.toLowerCase().includes('search') || 
             attrs.placeholder.toLowerCase().includes('customer') ||
             attrs.placeholder.toLowerCase().includes('name'))) {
          console.log('✅ Found potential customer search input!');
          
          // Type in it
          await input.fill('test');
          console.log('📝 Typed "test" in input');
          
          // Wait for any network activity
          const searchRequest = await page.waitForRequest(
            req => req.url().includes('/customers'),
            { timeout: 3000 }
          ).catch(() => null);
          
          if (searchRequest) {
            console.log('✅ NETWORK REQUEST DETECTED:', searchRequest.url());
          } else {
            console.log('❌ NO NETWORK REQUEST AFTER TYPING');
          }
          
          break;
        }
      }
    }
    
    // Print all console logs
    console.log('\n📋 ALL CONSOLE LOGS WITH SEARCH/ERROR KEYWORDS:');
    const relevantLogs = allLogs.filter(log => 
      log.toLowerCase().includes('search') ||
      log.toLowerCase().includes('customer') ||
      log.toLowerCase().includes('error') ||
      log.toLowerCase().includes('failed') ||
      log.includes('🔍') ||
      log.includes('❌') ||
      log.includes('⚠️')
    );
    
    if (relevantLogs.length === 0) {
      console.log('  ⚠️ No relevant logs found');
      console.log('\n  LAST 20 LOGS:');
      allLogs.slice(-20).forEach(log => console.log('  ', log));
    } else {
      relevantLogs.forEach(log => console.log('  ', log));
    }
  });
});