const { chromium } = require('playwright');

async function testEditBooking() {
  console.log('Starting Edit Booking Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({
      type: msg.type(),
      text: text,
      time: new Date().toISOString()
    });
    console.log(`[${msg.type().toUpperCase()}] ${text}`);
  });
  
  // Capture network requests
  page.on('request', request => {
    if (request.url().includes('/api/') && request.method() === 'PATCH') {
      console.log(`\n[NETWORK] ${request.method()} ${request.url()}`);
      console.log('[REQUEST BODY]:', request.postData());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/') && response.request().method() === 'PATCH') {
      console.log(`[RESPONSE] ${response.status()} ${response.statusText()}`);
    }
  });
  
  try {
    // Login first
    console.log('\n1. Logging in...');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    
    // Merchant login
    await page.fill('input[placeholder="Enter merchant code"]', 'HAMILTON');
    await page.fill('input[type="email"]', 'admin@hamiltonbeauty.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]:has-text("Login")');
    
    // Wait for PIN screen
    await page.waitForSelector('text=Enter your PIN', { timeout: 10000 });
    console.log('✓ Merchant login successful, entering PIN...');
    
    // Enter PIN
    await page.fill('input[placeholder="Enter your PIN"]', '9999');
    await page.click('button:has-text("Verify")');
    
    await page.waitForURL('**/calendar', { timeout: 10000 });
    console.log('✓ PIN verified, logged in successfully\n');
    
    // Go to bookings page
    console.log('2. Navigating to bookings...');
    await page.goto('http://localhost:3001/bookings');
    await page.waitForLoadState('networkidle');
    
    // Find the first booking with an Edit button
    console.log('3. Finding a booking to edit...');
    const editButton = await page.locator('a:has-text("Edit")').first();
    if (!editButton) {
      throw new Error('No bookings found with Edit button');
    }
    
    // Get the booking URL
    const editUrl = await editButton.getAttribute('href');
    console.log(`✓ Found booking to edit: ${editUrl}\n`);
    
    // Click edit
    console.log('4. Clicking Edit button...');
    await editButton.click();
    await page.waitForLoadState('networkidle');
    
    // Wait for the form to load
    await page.waitForSelector('input[type="time"]', { timeout: 5000 });
    console.log('✓ Edit form loaded\n');
    
    // Get current time value
    const currentTime = await page.inputValue('input[type="time"]');
    console.log(`5. Current booking time: ${currentTime}`);
    
    // Calculate new time (add 1 hour)
    const [hours, minutes] = currentTime.split(':').map(Number);
    const newHours = (hours + 1) % 24;
    const newTime = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    console.log(`   New booking time: ${newTime}\n`);
    
    // Clear console logs before the actual test
    consoleLogs.length = 0;
    
    // Change the time
    console.log('6. Changing the time...');
    await page.fill('input[type="time"]', newTime);
    console.log('✓ Time changed\n');
    
    // Wait a moment for any onChange handlers
    await page.waitForTimeout(500);
    
    // Click Save Changes
    console.log('7. Clicking Save Changes...');
    const saveButton = await page.locator('button:has-text("Save Changes")');
    
    // Log button state
    const isDisabled = await saveButton.isDisabled();
    console.log(`   Save button disabled: ${isDisabled}`);
    
    await saveButton.click();
    console.log('✓ Save button clicked\n');
    
    // Wait for either navigation or error
    await Promise.race([
      page.waitForURL('**/bookings/*', { timeout: 10000 }),
      page.waitForTimeout(5000)
    ]);
    
    // Check if we're still on the edit page
    const currentUrl = page.url();
    if (currentUrl.includes('/edit')) {
      console.log('⚠️  Still on edit page - save may have failed');
    } else {
      console.log('✓ Redirected to booking details page');
    }
    
    // Print all captured console logs
    console.log('\n=== CAPTURED CONSOLE LOGS ===');
    consoleLogs.forEach(log => {
      console.log(`[${log.type.toUpperCase()}] ${log.text}`);
    });
    
    // Check for any errors
    const errors = consoleLogs.filter(log => log.type === 'error');
    if (errors.length > 0) {
      console.log('\n=== ERRORS FOUND ===');
      errors.forEach(err => console.log(err.text));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Keep browser open for manual inspection
    console.log('\n\nTest complete. Browser will remain open for inspection.');
    console.log('Press Ctrl+C to exit.');
    
    // Wait indefinitely
    await new Promise(() => {});
  }
}

testEditBooking().catch(console.error);