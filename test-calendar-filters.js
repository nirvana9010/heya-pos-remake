const puppeteer = require('puppeteer');

async function testCalendarFilters() {
  let browser;
  
  try {
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1400, height: 900 }
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'info') {
        console.log('PAGE LOG:', msg.text());
      }
    });
    
    // Login
    console.log('🔐 Logging in...');
    await page.goto('http://localhost:3002/login', { waitUntil: 'networkidle0' });
    await page.type('input[name="username"]', 'HAMILTON');
    await page.type('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to calendar
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('✓ Logged in\n');
    
    // Wait for calendar to load
    await page.waitForSelector('[data-testid="calendar-view"]', { timeout: 10000 });
    console.log('📅 Calendar loaded\n');
    
    // Inject logging to check localStorage
    const filters = await page.evaluate(() => {
      const statusFilters = localStorage.getItem('calendar_statusFilters');
      const staffFilter = localStorage.getItem('calendar_staffFilter');
      console.log('LocalStorage status filters:', statusFilters);
      console.log('LocalStorage staff filter:', staffFilter);
      return {
        statusFilters: statusFilters ? JSON.parse(statusFilters) : null,
        staffFilter: staffFilter ? JSON.parse(staffFilter) : null
      };
    });
    
    console.log('📊 Current filter settings:');
    console.log('  Status filters:', filters.statusFilters);
    console.log('  Staff filter:', filters.staffFilter);
    
    // Check if completed is in the filters
    if (filters.statusFilters && !filters.statusFilters.includes('completed')) {
      console.log('\n⚠️  WARNING: "completed" is NOT in the status filters!');
      console.log('This would cause completed bookings to disappear from the calendar.\n');
    }
    
    // Look for filter UI elements
    const hasFilterButton = await page.$('[data-testid="filter-button"]') !== null;
    const hasStatusFilter = await page.$('[data-testid="status-filter"]') !== null;
    
    console.log('\n🔍 Filter UI elements:');
    console.log('  Filter button exists:', hasFilterButton);
    console.log('  Status filter exists:', hasStatusFilter);
    
    // Try to find and click filter button
    if (hasFilterButton) {
      await page.click('[data-testid="filter-button"]');
      await page.waitForTimeout(500);
      
      // Check which status filters are selected
      const selectedStatuses = await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][name*="status"]');
        const selected = [];
        checkboxes.forEach(cb => {
          if (cb.checked) {
            const label = cb.parentElement?.textContent || cb.value;
            selected.push(label);
          }
        });
        return selected;
      });
      
      console.log('\n✅ Currently selected status filters:', selectedStatuses);
    }
    
    // Check for any bookings with completed status
    const completedBookings = await page.evaluate(() => {
      const bookings = document.querySelectorAll('[data-status="completed"]');
      return bookings.length;
    });
    
    console.log(`\n📊 Completed bookings visible on calendar: ${completedBookings}`);
    
    // Keep browser open for manual inspection
    console.log('\n👀 Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testCalendarFilters();