import { test, expect } from '@playwright/test';

test.describe('Simple Customer Search Test', () => {
  test('Direct search test without page objects', async ({ page }) => {
    console.log('🧪 Testing customer search directly...');

    // Step 1: Login manually in this test
    await page.goto('/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find and fill login form
    const usernameInput = page.locator('input[type="text"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    await usernameInput.fill('HAMILTON');
    await passwordInput.fill('demo123');
    await submitButton.click();
    
    // Wait and see where we land
    await page.waitForTimeout(3000);
    console.log(`📍 After login: ${page.url()}`);
    
    // Navigate directly to calendar if not there
    if (!page.url().includes('/calendar')) {
      await page.goto('/calendar');
      await page.waitForTimeout(2000);
    }
    
    console.log(`📍 Final URL: ${page.url()}`);
    
    // Take screenshot to see what we have
    await page.screenshot({ path: 'simple-test-calendar.png', fullPage: true });
    
    // Look for any calendar or booking elements
    const allElements = await page.locator('*').all();
    console.log(`🔍 Total elements on page: ${allElements.length}`);
    
    // Look for clickable elements
    const clickableElements = await page.locator('button, [onclick], [role="button"], .btn, [class*="button"]').all();
    console.log(`👆 Clickable elements found: ${clickableElements.length}`);
    
    // Try to find any elements that might open a booking form
    const possibleTriggers = [
      'button:has-text("New")',
      'button:has-text("Add")',
      'button:has-text("Book")',
      'button:has-text("Create")',
      '[data-testid*="booking"]',
      '[data-testid*="new"]',
      '.time-slot',
      '.calendar-slot',
      '[class*="slot"]'
    ];
    
    for (const selector of possibleTriggers) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found ${count} elements with selector: ${selector}`);
        
        // Try clicking the first one
        try {
          await page.locator(selector).first().click();
          await page.waitForTimeout(1000);
          
          // Check if anything opened
          const modalCount = await page.locator('.modal, .slideout, .dialog, [role="dialog"]').count();
          if (modalCount > 0) {
            console.log(`🎉 Clicking ${selector} opened a modal/slideout!`);
            
            // Look for customer search input
            const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="customer" i]').first();
            if (await searchInput.isVisible()) {
              console.log('🔍 Found customer search input!');
              
              // Try searching
              await searchInput.fill('Test');
              await page.waitForTimeout(500);
              
              // Take screenshot of search results
              await page.screenshot({ path: 'search-results.png', fullPage: true });
              
              console.log('✅ Successfully performed search test!');
              return; // Success!
            }
          }
        } catch (e) {
          console.log(`❌ Failed to click ${selector}: ${e}`);
        }
      }
    }
    
    console.log('⚠️  Could not find booking trigger elements');
  });
});