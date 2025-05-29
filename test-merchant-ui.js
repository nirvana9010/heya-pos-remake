const puppeteer = require('puppeteer');

const MERCHANT_URL = 'http://localhost:3002';

async function testMerchantUI() {
  console.log('Testing Merchant App UI functionality...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Test login page
    console.log('1. Testing login page...');
    await page.goto(`${MERCHANT_URL}/login`, { waitUntil: 'networkidle0' });
    console.log('✓ Login page loaded');
    
    // Fill login form
    await page.type('input[name="username"]', 'HAMILTON');
    await page.type('input[name="password"]', 'demo123');
    
    // Submit form
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('✓ Login successful - redirected to dashboard');
    } else {
      console.log('✗ Login failed - current URL:', currentUrl);
    }
    
    // 2. Test services page
    console.log('\n2. Testing services page...');
    await page.goto(`${MERCHANT_URL}/services`, { waitUntil: 'networkidle0' });
    
    // Check if services are loaded
    await page.waitForSelector('[data-testid="service-item"], table tbody tr', { timeout: 5000 });
    const serviceCount = await page.$$eval('[data-testid="service-item"], table tbody tr', els => els.length);
    console.log(`✓ Services page loaded - ${serviceCount} services found`);
    
    // Check for add service button
    const addServiceBtn = await page.$('button:has-text("Add Service"), button:has-text("New Service"), button[aria-label*="add"]');
    if (addServiceBtn) {
      console.log('✓ Add service button found');
      
      // Try to click it to open dialog
      await addServiceBtn.click();
      await page.waitForTimeout(1000);
      
      const dialogVisible = await page.$('[role="dialog"], .dialog, .modal');
      if (dialogVisible) {
        console.log('✓ Service dialog opened');
        
        // Close dialog
        const closeBtn = await page.$('[aria-label="Close"], button:has-text("Cancel"), button:has-text("Close")');
        if (closeBtn) await closeBtn.click();
      } else {
        console.log('✗ Service dialog did not open');
      }
    } else {
      console.log('✗ Add service button not found');
    }
    
    // 3. Test customers page
    console.log('\n3. Testing customers page...');
    await page.goto(`${MERCHANT_URL}/customers`, { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('[data-testid="customer-item"], table tbody tr', { timeout: 5000 });
    const customerCount = await page.$$eval('[data-testid="customer-item"], table tbody tr', els => els.length);
    console.log(`✓ Customers page loaded - ${customerCount} customers found`);
    
    // 4. Test calendar/bookings page
    console.log('\n4. Testing bookings calendar...');
    await page.goto(`${MERCHANT_URL}/calendar`, { waitUntil: 'networkidle0' });
    
    // Wait for calendar to load
    await page.waitForSelector('.fc-view-container, .calendar-container, [data-testid="calendar"]', { timeout: 5000 });
    console.log('✓ Calendar page loaded');
    
    // Check for calendar view
    const calendarView = await page.$('.fc-view, .calendar-view, [data-testid="calendar-view"]');
    if (calendarView) {
      console.log('✓ Calendar view rendered');
    } else {
      console.log('✗ Calendar view not found');
    }
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\nMerchant UI test completed');
}

testMerchantUI().catch(console.error);