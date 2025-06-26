import { test, expect } from '@playwright/test';
import { NetworkMonitor } from './utils/network-monitor';

test.describe('Calendar Customer Search Test', () => {
  test('Test customer search in calendar booking slideout', async ({ page }) => {
    const monitor = new NetworkMonitor(page);
    
    console.log('🧪 Testing customer search on calendar booking slideout...');
    
    // Start monitoring
    await monitor.startMonitoring();
    
    // Navigate to calendar
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Current URL:', page.url());
    
    // Wait for calendar to load
    await page.waitForSelector('[data-calendar-grid]', { timeout: 10000 }).catch(() => {
      console.log('⚠️ Calendar grid not found, looking for any calendar view...');
    });
    
    // Click on an available time slot - try multiple selectors
    const slotSelectors = [
      '[data-slot-available="true"]',
      '[data-calendar-slot]',
      '.calendar-slot',
      'button[class*="slot"]',
      'div[class*="slot"]'
    ];
    
    let slotClicked = false;
    for (const selector of slotSelectors) {
      const slots = await page.$$(selector);
      console.log(`📋 Found ${slots.length} elements with selector: ${selector}`);
      
      if (slots.length > 0) {
        // Click the first available slot
        await slots[0].click();
        slotClicked = true;
        console.log(`✅ Clicked slot with selector: ${selector}`);
        break;
      }
    }
    
    if (!slotClicked) {
      // Alternative: Click the "New Booking" button if it exists
      const newBookingButton = await page.$('button:has-text("New Booking")');
      if (newBookingButton) {
        await newBookingButton.click();
        console.log('✅ Clicked "New Booking" button');
      } else {
        console.log('❌ Could not find any time slots or New Booking button to click');
      }
    }
    
    // Wait for the slideout to appear
    await page.waitForSelector('[data-slideout], [role="dialog"], .slide-out, div[class*="slide"]', { 
      timeout: 5000 
    }).catch(() => {
      console.log('⚠️ Slideout panel not found');
    });
    
    // Look for the customer search input
    const searchInputSelectors = [
      'input[placeholder*="Search customers"]',
      'input[placeholder*="search"]',
      'input[name*="customer"]',
      'input[id*="customer"]'
    ];
    
    let searchInput = null;
    for (const selector of searchInputSelectors) {
      searchInput = await page.$(selector);
      if (searchInput) {
        console.log(`✅ Found search input with selector: ${selector}`);
        break;
      }
    }
    
    if (!searchInput) {
      console.log('❌ No customer search input found in slideout');
      const allInputs = await page.$$('input');
      console.log(`📋 Total inputs found: ${allInputs.length}`);
      
      for (let i = 0; i < allInputs.length; i++) {
        const placeholder = await allInputs[i].getAttribute('placeholder');
        const name = await allInputs[i].getAttribute('name');
        const id = await allInputs[i].getAttribute('id');
        const isVisible = await allInputs[i].isVisible();
        console.log(`   Input ${i + 1}: placeholder="${placeholder}" name="${name}" id="${id}" visible=${isVisible}`);
      }
    } else {
      // Test the search functionality
      console.log('🚀 Testing customer search...');
      
      // Clear and type search query
      await searchInput.fill('');
      await searchInput.type('Test');
      
      console.log('⏳ Waiting for debounce (300ms)...');
      await page.waitForTimeout(500);
      
      console.log('⏳ Waiting for potential API response...');
      await page.waitForTimeout(1500);
      
      // Check console logs (if available)
      page.on('console', msg => {
        if (msg.text().includes('CustomerSearchInput')) {
          console.log('🖥️ Browser console:', msg.text());
        }
      });
      
      // Get API call count
      const searchEvents = monitor.getCustomerSearchEvents();
      console.log(`\n📊 SEARCH API CALLS: ${searchEvents.length}`);
      
      if (searchEvents.length === 0) {
        console.log('❌ NO API CALLS DETECTED - Search is using fallback!');
      } else {
        console.log('✅ API calls detected:');
        searchEvents.forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.request.method} ${event.request.url} - Status: ${event.response?.status}`);
        });
      }
    }
    
    // Stop monitoring
    monitor.stop();
    
    console.log('\n📊 FINAL SUMMARY:');
    console.log(`   Total network requests: ${monitor.getAllEvents().length}`);
    console.log(`   Customer search API calls: ${monitor.getCustomerSearchEvents().length}`);
  });
});