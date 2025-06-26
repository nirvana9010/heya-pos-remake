import { test, expect } from '@playwright/test';
import { NetworkMonitor } from './utils/network-monitor';

test.describe('Calendar Customer Search with Console Logging', () => {
  test('Capture console logs during customer search', async ({ page }) => {
    const monitor = new NetworkMonitor(page);
    const consoleLogs: string[] = [];
    
    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      
      // Print customer search related logs immediately
      if (text.includes('CustomerSearchInput') || text.includes('Customer search')) {
        console.log('🖥️ Browser Console:', text);
      }
    });
    
    // Also capture any page errors
    page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
      consoleLogs.push(`[error] ${error.message}`);
    });
    
    console.log('🧪 Testing customer search on calendar with console logging...');
    
    // Start monitoring
    await monitor.startMonitoring();
    
    // Navigate to calendar
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Current URL:', page.url());
    
    // Wait a bit for calendar to fully load
    await page.waitForTimeout(2000);
    
    // Try to find and click a time slot - use multiple strategies
    let slotClicked = false;
    
    // Strategy 1: Look for any clickable element in the calendar grid area
    const calendarArea = await page.$('.flex-1.overflow-x-auto'); // Calendar content area
    if (calendarArea) {
      // Get all clickable elements within the calendar
      const clickableElements = await calendarArea.$$('div[class*="cursor-pointer"]:not([class*="opacity-50"])');
      console.log(`📋 Found ${clickableElements.length} clickable elements in calendar area`);
      
      if (clickableElements.length > 0) {
        // Try to click one in the middle of the list (more likely to be visible)
        const index = Math.floor(clickableElements.length / 2);
        await clickableElements[index].click();
        slotClicked = true;
        console.log(`✅ Clicked element ${index + 1} of ${clickableElements.length}`);
      }
    }
    
    // Strategy 2: Try clicking coordinates in the calendar grid
    if (!slotClicked) {
      try {
        // Click somewhere in the middle of the calendar
        await page.mouse.click(600, 400);
        console.log('✅ Clicked at coordinates (600, 400)');
        slotClicked = true;
      } catch (e) {
        console.log('❌ Could not click at coordinates');
      }
    }
    
    // Wait for slideout to appear
    let slideoutFound = false;
    try {
      await page.waitForSelector('[data-state="open"], [role="dialog"], .fixed.inset-y-0.right-0', { 
        timeout: 5000 
      });
      slideoutFound = true;
      console.log('✅ Slideout panel appeared');
    } catch (e) {
      console.log('⚠️ Slideout panel did not appear within 5 seconds');
    }
    
    if (slideoutFound) {
      // Look for customer search input
      const searchInput = await page.$('input[placeholder*="Search customers"]');
      
      if (searchInput) {
        console.log('✅ Found customer search input');
        console.log('📝 Typing search query...');
        
        // Clear and type
        await searchInput.fill('');
        await searchInput.type('test', { delay: 100 });
        
        console.log('⏳ Waiting for search to execute...');
        await page.waitForTimeout(2000); // Wait for debounce and potential API call
        
        // Check for search results
        const resultsVisible = await page.$('.z-50') !== null;
        console.log(`📋 Search results visible: ${resultsVisible}`);
        
      } else {
        console.log('❌ Customer search input not found in slideout');
      }
    }
    
    // Get network statistics
    const searchEvents = monitor.getCustomerSearchEvents();
    console.log(`\n📊 API CALL SUMMARY:`);
    console.log(`   Total network requests: ${monitor.getAllEvents().length}`);
    console.log(`   Customer search API calls: ${searchEvents.length}`);
    
    if (searchEvents.length === 0) {
      console.log('❌ NO SEARCH API CALLS DETECTED');
    } else {
      searchEvents.forEach((event, i) => {
        console.log(`   ${i + 1}. ${event.request.method} ${event.request.url} - Status: ${event.response?.status}`);
      });
    }
    
    // Print all console logs related to customer search
    console.log('\n📋 ALL CONSOLE LOGS:');
    consoleLogs
      .filter(log => log.includes('Customer') || log.includes('search') || log.includes('API'))
      .forEach(log => console.log(log));
    
    // Stop monitoring
    monitor.stopMonitoring();
  });
});