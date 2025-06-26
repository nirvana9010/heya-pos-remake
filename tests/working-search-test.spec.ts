import { test, expect } from '@playwright/test';
import { NetworkMonitor } from './utils/network-monitor';
import { AuthUtils } from './utils/auth';

test.describe('Working Customer Search Test', () => {
  test('Find and test customer search functionality', async ({ browser }) => {
    const context = await AuthUtils.getAuthenticatedContext(browser);
    const page = await context.newPage();
    const networkMonitor = new NetworkMonitor(page);

    console.log('🧪 Testing customer search functionality...');

    try {
      // Start network monitoring
      await networkMonitor.startMonitoring();

      // Navigate to calendar (should already be authenticated)
      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');
      
      console.log(`📍 Current URL: ${page.url()}`);
      
      // Take screenshot to see what we have
      await page.screenshot({ path: 'working-test-calendar.png', fullPage: true });
      
      // Look for any clickable elements that might open booking form
      console.log('🔍 Looking for booking triggers...');
      
      // Get all clickable elements and analyze them
      const clickableElements = await page.locator('button, [role="button"], [onclick], .btn, [class*="button"], [class*="slot"], [class*="time"]').all();
      console.log(`👆 Found ${clickableElements.length} potentially clickable elements`);
      
      // Try clicking various elements to find booking trigger
      let bookingFormOpened = false;
      let attempts = 0;
      const maxAttempts = Math.min(10, clickableElements.length);
      
      for (let i = 0; i < maxAttempts && !bookingFormOpened; i++) {
        attempts++;
        const element = clickableElements[i];
        
        try {
          // Get element info
          const tagName = await element.evaluate(el => el.tagName);
          const className = await element.evaluate(el => el.className);
          const textContent = await element.evaluate(el => el.textContent?.trim() || '');
          
          console.log(`🎯 Attempt ${attempts}: ${tagName} class="${className}" text="${textContent.slice(0, 50)}"`);
          
          // Skip navigation or obvious non-booking elements
          if (textContent.toLowerCase().includes('nav') || 
              textContent.toLowerCase().includes('menu') ||
              textContent.toLowerCase().includes('logout') ||
              className.includes('nav')) {
            continue;
          }
          
          // Click the element
          await element.click();
          await page.waitForTimeout(1000);
          
          // Check if a modal, slideout, or form appeared
          const modalSelectors = [
            '.modal',
            '.slideout', 
            '.dialog',
            '[role="dialog"]',
            '[data-testid*="booking"]',
            '[data-testid*="modal"]',
            '.overlay',
            '.popup',
            '[class*="slide"]',
            '[class*="modal"]'
          ];
          
          for (const selector of modalSelectors) {
            const modalElements = await page.locator(selector).count();
            if (modalElements > 0) {
              const isVisible = await page.locator(selector).first().isVisible();
              if (isVisible) {
                console.log(`🎉 Found modal/slideout: ${selector}`);
                
                // Look for customer search input
                const searchInputSelectors = [
                  'input[placeholder*="search" i]',
                  'input[placeholder*="customer" i]',
                  'input[placeholder*="find" i]',
                  'input[type="text"]',
                  'input[type="search"]'
                ];
                
                for (const inputSelector of searchInputSelectors) {
                  const searchInputs = await page.locator(inputSelector).count();
                  if (searchInputs > 0) {
                    const searchInput = page.locator(inputSelector).first();
                    if (await searchInput.isVisible()) {
                      console.log(`🔍 Found search input: ${inputSelector}`);
                      
                      // Test customer search!
                      console.log('🚀 Testing customer search...');
                      await searchInput.fill('Test');
                      await page.waitForTimeout(500); // Wait for debounce
                      
                      // Wait for potential API call
                      await page.waitForTimeout(1000);
                      
                      // Take screenshot of search results
                      await page.screenshot({ path: 'search-test-results.png', fullPage: true });
                      
                      // Check for dropdown or results
                      const dropdownCount = await page.locator('.absolute, .dropdown, [class*="dropdown"], [class*="results"]').count();
                      console.log(`📋 Found ${dropdownCount} potential dropdown/results elements`);
                      
                      // Get network stats
                      const searchStats = networkMonitor.getSearchRequestStats();
                      console.log(`🌐 API Requests: ${searchStats.total}, Successful: ${searchStats.successful}, Failed: ${searchStats.failed}`);
                      
                      if (searchStats.total > 0) {
                        console.log('✅ Customer search API call was made!');
                        
                        // Try multiple searches to test the intermittent issue
                        const queries = ['John', 'Jane', 'Search'];
                        let successCount = 0;
                        
                        for (const query of queries) {
                          console.log(`🔄 Testing search with: "${query}"`);
                          await searchInput.fill('');
                          await page.waitForTimeout(100);
                          await searchInput.fill(query);
                          await page.waitForTimeout(600); // Wait for debounce + API
                          
                          const currentStats = networkMonitor.getSearchRequestStats();
                          if (currentStats.total > searchStats.total) {
                            successCount++;
                            console.log(`✅ Search "${query}" triggered API call`);
                          } else {
                            console.log(`❌ Search "${query}" did not trigger API call`);
                          }
                        }
                        
                        console.log(`📊 Search success rate: ${successCount}/${queries.length}`);
                        
                        if (successCount < queries.length) {
                          console.log('🚨 INTERMITTENT SEARCH ISSUE DETECTED!');
                        }
                        
                        bookingFormOpened = true;
                        break;
                      } else {
                        console.log('⚠️  No API calls detected for search');
                      }
                    }
                  }
                }
                
                if (bookingFormOpened) break;
              }
            }
          }
          
        } catch (error) {
          console.log(`❌ Error clicking element ${attempts}: ${error}`);
        }
        
        // Small delay between attempts
        await page.waitForTimeout(200);
      }
      
      if (!bookingFormOpened) {
        console.log('⚠️  Could not find booking form or customer search');
        
        // Try direct navigation if available
        const directBookingUrls = ['/bookings/new', '/booking/new', '/calendar/new'];
        for (const url of directBookingUrls) {
          try {
            await page.goto(url);
            await page.waitForTimeout(1000);
            
            const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="customer" i]').first();
            if (await searchInput.isVisible()) {
              console.log(`✅ Found booking form at ${url}`);
              await searchInput.fill('Test');
              await page.waitForTimeout(600);
              
              const finalStats = networkMonitor.getSearchRequestStats();
              console.log(`🌐 Final API stats: ${finalStats.total} requests`);
              bookingFormOpened = true;
              break;
            }
          } catch (e) {
            // URL doesn't exist, continue
          }
        }
      }
      
      // Final network summary
      networkMonitor.logSummary();
      
      if (bookingFormOpened) {
        console.log('🎉 Successfully tested customer search functionality!');
      } else {
        console.log('❌ Could not locate customer search functionality');
      }
      
    } finally {
      networkMonitor.stopMonitoring();
      await page.close();
    }
  });
});