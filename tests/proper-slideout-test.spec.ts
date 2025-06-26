import { test, expect } from '@playwright/test';

test.describe('Proper Slideout Search Test', () => {
  test('Open booking slideout and test customer search', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Customer')) {
        console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });
    
    // Navigate to calendar
    console.log('🔍 Navigating to calendar...');
    await page.goto('/calendar', { waitUntil: 'networkidle' });
    
    // Handle login if needed
    if (page.url().includes('/login')) {
      const quickLoginButton = page.locator('button:has-text("Quick Login as Hamilton")');
      if (await quickLoginButton.isVisible({ timeout: 2000 })) {
        await quickLoginButton.click();
        await page.waitForURL('**/calendar', { timeout: 10000 });
      }
    }
    
    // Wait for calendar to load
    await page.waitForTimeout(2000);
    
    // Find and click a time slot in the calendar
    console.log('🎯 Looking for time slots to click...');
    
    // Look for time slots in the daily view
    const timeSlot = await page.locator('div.cursor-pointer.h-\\[60px\\]').first();
    
    if (await timeSlot.isVisible()) {
      console.log('✅ Found time slot, clicking...');
      await timeSlot.click();
      
      // Wait for slideout to appear
      console.log('⏳ Waiting for booking slideout...');
      
      // Wait for the slideout panel
      const slideout = await page.waitForSelector('[data-state="open"], .fixed.inset-y-0.right-0', { 
        timeout: 5000 
      }).catch(() => null);
      
      if (slideout) {
        console.log('✅ Slideout appeared');
        
        // Now look for the customer search input INSIDE the slideout
        const customerSearchInput = await page.locator('input[placeholder*="Search customers"]').all();
        console.log(`📋 Found ${customerSearchInput.length} search inputs`);
        
        // Find the one in the slideout (usually the last one)
        let correctInput = null;
        for (const input of customerSearchInput) {
          const placeholder = await input.getAttribute('placeholder');
          console.log(`  Input placeholder: "${placeholder}"`);
          
          if (placeholder && placeholder.toLowerCase().includes('name') || placeholder.toLowerCase().includes('phone') || placeholder.toLowerCase().includes('email')) {
            correctInput = input;
            console.log('  ✅ This looks like the customer search input');
            break;
          }
        }
        
        if (correctInput) {
          // Type in the search field
          console.log('📝 Typing "test" in customer search...');
          await correctInput.fill('test');
          
          // Monitor network requests
          const searchRequestPromise = page.waitForRequest(req => 
            req.url().includes('/customers/search'), 
            { timeout: 3000 }
          ).catch(() => null);
          
          // Wait for potential API call
          await page.waitForTimeout(1000);
          
          const searchRequest = await searchRequestPromise;
          if (searchRequest) {
            console.log('✅ API request made:', searchRequest.url());
            
            const response = await searchRequest.response();
            if (response) {
              console.log('  Status:', response.status());
              const body = await response.text().catch(() => 'Could not read body');
              console.log('  Response:', body.substring(0, 200));
            }
          } else {
            console.log('❌ No API request to /customers/search detected');
          }
          
          // Check if dropdown appeared
          const dropdown = await page.locator('.z-50').first();
          if (await dropdown.isVisible()) {
            console.log('✅ Search dropdown is visible');
            
            // Count results
            const results = await page.locator('.z-50 button[type="button"]').count();
            console.log(`📋 Found ${results} search results`);
          } else {
            console.log('❌ No search dropdown appeared');
          }
          
          // Take a screenshot
          await page.screenshot({ path: 'screenshots/customer-search-state.png', fullPage: true });
          console.log('📸 Screenshot saved');
          
        } else {
          console.log('❌ Could not find customer search input in slideout');
        }
      } else {
        console.log('❌ Slideout did not appear');
      }
    } else {
      console.log('❌ No time slots found to click');
    }
    
    // Final check - evaluate what's happening in the browser
    const browserState = await page.evaluate(() => {
      // Check for any error messages
      const errorElements = Array.from(document.querySelectorAll('[class*="error"], [class*="Error"]'));
      const errors = errorElements.map(el => el.textContent);
      
      // Check localStorage for auth
      const hasToken = !!localStorage.getItem('access_token');
      const user = localStorage.getItem('user');
      
      return {
        errors,
        hasToken,
        user: user ? JSON.parse(user) : null,
        url: window.location.href
      };
    });
    
    console.log('\n📊 Browser state:', JSON.stringify(browserState, null, 2));
  });
});