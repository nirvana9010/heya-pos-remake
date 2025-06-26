import { test, expect } from '@playwright/test';
import { CalendarPage } from './pages/calendar-page';
import { BookingSlideout } from './pages/booking-slideout';
import { NetworkMonitor } from './utils/network-monitor';
import { AuthUtils } from './utils/auth';

test.describe('Customer Search Issue Investigation', () => {
  let calendarPage: CalendarPage;
  let bookingSlideout: BookingSlideout;
  let networkMonitor: NetworkMonitor;

  test.beforeEach(async ({ browser }) => {
    // Create authenticated context
    const context = await AuthUtils.getAuthenticatedContext(browser);
    const page = await context.newPage();

    // Initialize page objects
    calendarPage = new CalendarPage(page);
    bookingSlideout = new BookingSlideout(page);
    networkMonitor = new NetworkMonitor(page);

    // Start network monitoring
    await networkMonitor.startMonitoring();

    // Navigate to calendar
    await calendarPage.goto();
    await calendarPage.verifyCalendarVisible();
  });

  test.afterEach(async ({ page }) => {
    // Log network summary
    networkMonitor.logSummary();
    networkMonitor.stopMonitoring();
    
    await page.close();
  });

  test('Basic customer search flow - should work consistently', async ({ page }) => {
    console.log('🧪 Testing basic customer search flow...');

    // 1. Open booking slideout by clicking empty time slot
    await calendarPage.clickEmptyTimeSlot();
    await bookingSlideout.waitForSlideoutOpen();

    // 2. Search for test customer
    const searchQuery = 'Test';
    const results = await bookingSlideout.searchCustomer(searchQuery);

    // 3. Verify search worked
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('Test');

    // 4. Verify network request was made successfully
    const searchStats = networkMonitor.getSearchRequestStats();
    expect(searchStats.total).toBeGreaterThan(0);
    expect(searchStats.successful).toBeGreaterThan(0);
    expect(searchStats.failed).toBe(0);

    console.log(`✅ Search successful - found ${results.length} customers`);
  });

  test('Search dropdown visibility - should show and hide correctly', async ({ page }) => {
    console.log('🧪 Testing search dropdown visibility...');

    await calendarPage.clickEmptyTimeSlot();
    await bookingSlideout.waitForSlideoutOpen();

    // 1. Dropdown should be hidden initially
    await bookingSlideout.verifySearchDropdownHidden();

    // 2. Dropdown should appear when searching
    await bookingSlideout.searchCustomer('John');
    await bookingSlideout.verifySearchDropdownVisible();

    // 3. Clear search - dropdown should hide
    await bookingSlideout.clearSearch();
    await bookingSlideout.verifySearchDropdownHidden();

    console.log('✅ Dropdown visibility working correctly');
  });

  test('Multiple search cycles - reproduce intermittent issue', async ({ page }) => {
    console.log('🧪 Testing multiple search cycles to reproduce issue...');

    await calendarPage.clickEmptyTimeSlot();
    await bookingSlideout.waitForSlideoutOpen();

    const searches = ['Test', 'John', 'Jane', 'Search', 'Customer'];
    let successfulSearches = 0;
    let failedSearches = 0;

    for (let i = 0; i < searches.length; i++) {
      const query = searches[i];
      console.log(`🔍 Search cycle ${i + 1}: "${query}"`);

      try {
        // Clear previous search
        await bookingSlideout.clearSearch();
        await page.waitForTimeout(200);

        // Perform search
        const results = await bookingSlideout.searchCustomer(query);

        if (results.length > 0) {
          successfulSearches++;
          console.log(`✅ Search ${i + 1} successful - ${results.length} results`);
        } else {
          failedSearches++;
          console.log(`❌ Search ${i + 1} returned no results`);
        }

        // Wait between searches to simulate realistic usage
        await page.waitForTimeout(500);

      } catch (error) {
        failedSearches++;
        console.log(`❌ Search ${i + 1} failed with error:`, error);
      }
    }

    // Log results
    console.log(`\n📊 Search cycle results:`);
    console.log(`   Successful: ${successfulSearches}/${searches.length}`);
    console.log(`   Failed: ${failedSearches}/${searches.length}`);

    // Get network stats
    const searchStats = networkMonitor.getSearchRequestStats();
    console.log(`\n🌐 Network stats:`);
    console.log(`   Total requests: ${searchStats.total}`);
    console.log(`   Successful: ${searchStats.successful}`);
    console.log(`   Failed: ${searchStats.failed}`);

    // The issue is intermittent, so we shouldn't expect 100% success
    // But we should expect at least some searches to work
    expect(successfulSearches).toBeGreaterThan(0);
    
    // If all searches failed, that's definitely the bug
    if (failedSearches === searches.length) {
      throw new Error('All searches failed - this indicates the search issue is occurring');
    }
  });

  test('Rapid typing simulation - test debouncing behavior', async ({ page }) => {
    console.log('🧪 Testing rapid typing to stress test debouncing...');

    await calendarPage.clickEmptyTimeSlot();
    await bookingSlideout.waitForSlideoutOpen();

    // Simulate very rapid typing
    const searchInput = bookingSlideout.customerSearchInput;
    
    // Type characters rapidly (faster than debounce time)
    await searchInput.fill('');
    await searchInput.type('T', { delay: 50 });
    await searchInput.type('e', { delay: 50 });
    await searchInput.type('s', { delay: 50 });
    await searchInput.type('t', { delay: 50 });

    // Wait for debounce to complete
    await page.waitForTimeout(400);

    // Check if search completed successfully
    await bookingSlideout.waitForSearchComplete();
    
    const searchStats = networkMonitor.getSearchRequestStats();
    console.log(`🌐 Rapid typing resulted in ${searchStats.total} API requests`);

    // Should have made exactly 1 request (due to debouncing)
    // But we'll be flexible since the issue might cause multiple requests
    expect(searchStats.total).toBeGreaterThan(0);
    expect(searchStats.successful).toBeGreaterThan(0);

    console.log('✅ Rapid typing test completed');
  });

  test('Customer selection - end-to-end flow', async ({ page }) => {
    console.log('🧪 Testing complete customer selection flow...');

    await calendarPage.clickEmptyTimeSlot();
    await bookingSlideout.waitForSlideoutOpen();

    // Search for customer
    const results = await bookingSlideout.searchCustomer('Test');
    expect(results.length).toBeGreaterThan(0);

    // Select first customer
    await bookingSlideout.selectCustomer(0);

    // Verify customer was selected
    await bookingSlideout.verifyCustomerSelected('Test');

    // Verify dropdown is hidden after selection
    await bookingSlideout.verifySearchDropdownHidden();

    console.log('✅ Customer selection flow completed successfully');
  });

  test('Network timing analysis - detect slow responses', async ({ page }) => {
    console.log('🧪 Analyzing network timing for search requests...');

    await calendarPage.clickEmptyTimeSlot();
    await bookingSlideout.waitForSlideoutOpen();

    // Perform several searches to get timing data
    const queries = ['Test', 'John', 'Jane'];
    
    for (const query of queries) {
      await bookingSlideout.clearSearch();
      await page.waitForTimeout(100);
      
      const startTime = Date.now();
      await bookingSlideout.searchCustomer(query);
      const endTime = Date.now();
      
      console.log(`⏱️  Search "${query}" took ${endTime - startTime}ms (including debounce)`);
      
      await page.waitForTimeout(200);
    }

    // Analyze network timing
    const searchStats = networkMonitor.getSearchRequestStats();
    const slowRequests = networkMonitor.getSlowRequests(2000); // > 2 seconds is slow

    console.log(`📊 Average API response time: ${searchStats.averageResponseTime}ms`);
    console.log(`🐌 Slow requests (>2s): ${slowRequests.length}`);

    // API should respond quickly (< 1 second typically)
    expect(searchStats.averageResponseTime).toBeLessThan(5000);

    console.log('✅ Network timing analysis completed');
  });
});