import { test, expect } from '@playwright/test';
import { NetworkMonitor } from './utils/network-monitor';
import { AuthUtils } from './utils/auth';

test.describe('Focused Customer Search Test', () => {
  test('Test customer search on booking page with detailed monitoring', async ({ browser }) => {
    const context = await AuthUtils.getAuthenticatedContext(browser);
    const page = await context.newPage();
    const networkMonitor = new NetworkMonitor(page);

    console.log('🧪 Testing customer search on /bookings/new...');

    try {
      // Start network monitoring
      await networkMonitor.startMonitoring();

      // Navigate directly to the booking page
      await page.goto('/bookings/new');
      await page.waitForLoadState('networkidle');
      
      console.log(`📍 Current URL: ${page.url()}`);
      
      // Take screenshot to see the booking form
      await page.screenshot({ path: 'focused-booking-page.png', fullPage: true });
      
      // Look for customer search input with detailed analysis
      console.log('🔍 Analyzing customer search input...');
      
      const inputSelectors = [
        'input[placeholder*="search" i]',
        'input[placeholder*="customer" i]',
        'input[placeholder*="find" i]',
        'input[type="text"]',
        'input[type="search"]'
      ];
      
      let searchInput = null;
      
      for (const selector of inputSelectors) {
        const inputs = await page.locator(selector).all();
        console.log(`📝 Found ${inputs.length} inputs with selector: ${selector}`);
        
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          const placeholder = await input.getAttribute('placeholder');
          const isVisible = await input.isVisible();
          const name = await input.getAttribute('name');
          const id = await input.getAttribute('id');
          
          console.log(`   Input ${i + 1}: placeholder="${placeholder}" name="${name}" id="${id}" visible=${isVisible}`);
          
          if (isVisible && placeholder && 
              (placeholder.toLowerCase().includes('search') || 
               placeholder.toLowerCase().includes('customer') ||
               placeholder.toLowerCase().includes('find'))) {
            searchInput = input;
            console.log(`✅ Selected search input: ${selector} with placeholder="${placeholder}"`);
            break;
          }
        }
        
        if (searchInput) break;
      }
      
      if (!searchInput) {
        // Try any visible text input as fallback
        const textInputs = await page.locator('input[type="text"]').all();
        for (const input of textInputs) {
          if (await input.isVisible()) {
            searchInput = input;
            console.log('📝 Using fallback text input');
            break;
          }
        }
      }
      
      if (!searchInput) {
        console.log('❌ No customer search input found');
        return;
      }
      
      // Test customer search with detailed monitoring
      console.log('🚀 Testing customer search...');
      
      // Clear any existing value
      await searchInput.fill('');
      await page.waitForTimeout(100);
      
      console.log('📤 Typing "Test" in search input...');
      await searchInput.type('Test', { delay: 100 }); // Slow typing to see each character
      
      console.log('⏳ Waiting for debounce (300ms)...');
      await page.waitForTimeout(400);
      
      console.log('⏳ Waiting for potential API response...');
      await page.waitForTimeout(1000);
      
      // Take screenshot after search
      await page.screenshot({ path: 'focused-after-search.png', fullPage: true });
      
      // Check for any dropdowns or results
      const dropdownSelectors = [
        '.absolute',
        '.dropdown',
        '[class*="dropdown"]',
        '[class*="results"]',
        '[class*="search"]',
        '.z-50',
        '[style*="absolute"]'
      ];
      
      console.log('🔍 Looking for search results dropdown...');
      
      for (const selector of dropdownSelectors) {
        const elements = await page.locator(selector).count();
        if (elements > 0) {
          const visibleElements = await page.locator(selector).filter({ hasText: /.+/ }).count();
          console.log(`📋 Found ${elements} elements (${visibleElements} with text) for selector: ${selector}`);
          
          if (visibleElements > 0) {
            const text = await page.locator(selector).first().textContent();
            console.log(`   Content: ${text?.slice(0, 100)}...`);
          }
        }
      }
      
      // Test multiple search queries to detect intermittent behavior
      const queries = ['John', 'Jane', 'Search', 'Customer', 'Test'];
      let totalApiCalls = 0;
      
      console.log('🔄 Testing multiple search queries for intermittent behavior...');
      
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        console.log(`🔍 Search ${i + 1}: "${query}"`);
        
        // Clear and type new query
        await searchInput.fill('');
        await page.waitForTimeout(100);
        await searchInput.fill(query);
        await page.waitForTimeout(500); // Wait for debounce + API
        
        const currentStats = networkMonitor.getSearchRequestStats();
        const newApiCalls = currentStats.total - totalApiCalls;
        totalApiCalls = currentStats.total;
        
        console.log(`   API calls for "${query}": ${newApiCalls}`);
        
        if (newApiCalls === 0) {
          console.log(`❌ No API call for "${query}" - potential issue detected!`);
        } else {
          console.log(`✅ API call successful for "${query}"`);
        }
        
        // Small delay between searches
        await page.waitForTimeout(300);
      }
      
      // Rapid typing test to stress test debouncing
      console.log('⚡ Testing rapid typing (stress test)...');
      await searchInput.fill('');
      await page.waitForTimeout(100);
      
      // Type very quickly
      const rapidQuery = 'RapidTest';
      for (const char of rapidQuery) {
        await searchInput.type(char, { delay: 50 }); // Very fast typing
      }
      
      await page.waitForTimeout(600); // Wait for debounce + API
      
      const finalStats = networkMonitor.getSearchRequestStats();
      console.log(`⚡ Rapid typing result: ${finalStats.total - totalApiCalls} API calls`);
      
      // Final summary
      console.log('\n📊 CUSTOMER SEARCH TEST SUMMARY:');
      console.log(`   Total API requests: ${finalStats.total}`);
      console.log(`   Successful requests: ${finalStats.successful}`);
      console.log(`   Failed requests: ${finalStats.failed}`);
      console.log(`   Average response time: ${finalStats.averageResponseTime}ms`);
      
      if (finalStats.failed > 0) {
        console.log('🚨 API failures detected!');
      }
      
      if (finalStats.total < queries.length) {
        console.log('🚨 INTERMITTENT SEARCH ISSUE CONFIRMED!');
        console.log(`   Expected ${queries.length} API calls, got ${finalStats.total}`);
      }
      
      // Log detailed events
      const allEvents = networkMonitor.getAllEvents();
      const searchEvents = allEvents.filter(e => e.request.url.includes('/customers/search'));
      
      if (searchEvents.length > 0) {
        console.log('\n🌐 SEARCH API CALLS DETECTED:');
        searchEvents.forEach((event, i) => {
          console.log(`   ${i + 1}. ${event.request.method} ${event.request.url}`);
          if (event.response) {
            console.log(`      Status: ${event.response.status}, Time: ${event.response.timing}ms`);
            if (event.response.body?.data) {
              console.log(`      Results: ${event.response.body.data.length} customers`);
            }
          } else if (event.error) {
            console.log(`      Error: ${event.error}`);
          }
        });
      } else {
        console.log('\n❌ NO SEARCH API CALLS DETECTED');
        console.log('   This indicates the search functionality is not working');
      }
      
    } finally {
      networkMonitor.stopMonitoring();
      await page.close();
    }
  });
});