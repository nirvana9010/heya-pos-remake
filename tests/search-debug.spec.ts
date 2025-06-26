import { test, expect } from '@playwright/test';

test.describe('Search Debug', () => {
  test('Debug search state issue', async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('CustomerSearchInput') || 
          text.includes('🔄') || text.includes('🟢') || 
          text.includes('🔴') || text.includes('🟡') ||
          text.includes('⏰')) {
        console.log(`🖥️  CONSOLE: ${text}`);
      }
    });
    // Monitor network requests
    const searchRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/customers/search')) {
        searchRequests.push({
          url: request.url(),
          query: new URL(request.url()).searchParams.get('q')
        });
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/customers/search')) {
        const query = new URL(response.url()).searchParams.get('q');
        try {
          const data = await response.json();
          console.log(`🌐 API Response for "${query}": ${data.data.length} results`);
          if (data.data.length > 0) {
            console.log(`  First result: ${data.data[0].firstName} ${data.data[0].lastName}`);
          }
        } catch (e) {
          console.log(`  Failed to parse response`);
        }
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
    
    // Click on a time slot
    const emptySlot = page.locator('div.cursor-pointer.h-\\[60px\\]:not(:has(*))').first();
    await emptySlot.click();
    
    // Wait for slideout
    await page.waitForSelector('text="New Booking"', { timeout: 5000 });
    
    // Navigate to Customer step
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Select a service
    const serviceButton = page.locator('button:has(h4)').first();
    await serviceButton.click();
    await page.waitForTimeout(500);
    
    // Go to Customer step
    await nextButton.click();
    await page.waitForTimeout(500);
    
    // Find the search input
    const searchInput = page.locator('input[placeholder="Search customers by name, phone, or email..."]');
    
    // SEARCH 1: Lukas
    console.log('\n🔍 SEARCH 1: "Lukas"');
    await searchInput.fill('Lukas');
    await page.waitForTimeout(1500);
    
    // Count visible customer results
    const lukasButton = page.locator('button:has-text("Lukas Nguyen")');
    const lukasVisible = await lukasButton.isVisible();
    console.log(`✓ Lukas Nguyen visible: ${lukasVisible}`);
    
    // CLEAR
    console.log('\n🧹 CLEARING INPUT');
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    // SEARCH 2: Test
    console.log('\n🔍 SEARCH 2: "Test"');
    await searchInput.fill('Test');
    await page.waitForTimeout(1500);
    
    // Check what's visible
    const lukasStillVisible = await lukasButton.isVisible();
    console.log(`❌ Lukas Nguyen still visible: ${lukasStillVisible}`);
    
    // Look for any Test results
    const testResults = await page.locator('button:has-text("Test")').count();
    console.log(`✓ Results containing "Test": ${testResults}`);
    
    // Get all visible customer buttons
    const allButtons = await page.locator('button').filter({ has: page.locator('text=/@|\\+/') }).all();
    console.log(`\n📋 All visible customer buttons: ${allButtons.length}`);
    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent();
      if (text?.includes('@') || text?.includes('+')) {
        console.log(`  ${i + 1}. ${text.replace(/\\s+/g, ' ').trim()}`);
      }
    }
    
    // Summary
    console.log('\n📊 NETWORK REQUESTS:');
    searchRequests.forEach(req => {
      console.log(`  - Search for "${req.query}"`);
    });
    
    console.log('\n🐛 BUG STATUS:');
    if (lukasStillVisible && searchRequests.some(r => r.query === 'Test')) {
      console.log('  ❌ CONFIRMED: Lukas still showing after searching for Test');
    } else if (!lukasStillVisible && testResults > 0) {
      console.log('  ✅ FIXED: Search results update correctly');
    } else {
      console.log('  ⚠️  UNCLEAR: Need more investigation');
    }
  });
});