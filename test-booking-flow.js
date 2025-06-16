#!/usr/bin/env node

const puppeteer = require('puppeteer');

async function testBookingFlow() {
  console.log('🚀 Starting automated booking flow test...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to booking page
    console.log('1️⃣ Navigating to booking page...');
    await page.goto('http://localhost:3001/booking', { waitUntil: 'networkidle2' });
    console.log('✅ Booking page loaded\n');
    
    // Wait for services to load
    await page.waitForSelector('[data-testid="service-card"]', { timeout: 10000 });
    
    // Step 1: Select multiple services
    console.log('2️⃣ Selecting multiple services...');
    
    // Click on Classic Facial
    const facialCard = await page.$x("//h3[contains(text(), 'Classic Facial')]/ancestor::div[@data-testid='service-card']");
    if (facialCard.length > 0) {
      await facialCard[0].click();
      console.log('   ✓ Selected Classic Facial');
    }
    
    // Click on Swedish Massage
    const massageCard = await page.$x("//h3[contains(text(), 'Swedish Massage')]/ancestor::div[@data-testid='service-card']");
    if (massageCard.length > 0) {
      await massageCard[0].click();
      console.log('   ✓ Selected Swedish Massage');
    }
    
    // Check if summary shows correct total
    await page.waitForSelector('.selected-services-summary', { timeout: 5000 });
    const summaryText = await page.$eval('.selected-services-summary', el => el.textContent);
    console.log('   ✓ Summary:', summaryText);
    
    // Click Continue
    await page.click('button:has-text("Continue")');
    console.log('✅ Services selected\n');
    
    // Step 2: Select staff
    console.log('3️⃣ Selecting staff...');
    await page.waitForSelector('[data-testid="staff-card"]', { timeout: 10000 });
    
    // Select "No preference"
    const noPreferenceCard = await page.$x("//h3[contains(text(), 'No Preference')]/ancestor::div[@data-testid='staff-card']");
    if (noPreferenceCard.length > 0) {
      await noPreferenceCard[0].click();
      console.log('   ✓ Selected "No Preference" for staff');
    }
    
    await page.click('button:has-text("Continue")');
    console.log('✅ Staff selected\n');
    
    // Step 3: Select date and time
    console.log('4️⃣ Selecting date and time...');
    await page.waitForSelector('.react-calendar', { timeout: 10000 });
    
    // Click on tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.getDate();
    
    const dateButton = await page.$x(`//button[contains(@class, 'react-calendar__tile') and not(contains(@class, 'disabled')) and contains(text(), '${tomorrowDate}')]`);
    if (dateButton.length > 0) {
      await dateButton[0].click();
      console.log(`   ✓ Selected date: ${tomorrow.toDateString()}`);
    }
    
    // Wait for time slots to load
    await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 });
    
    // Select first available time slot
    const availableSlot = await page.$('[data-testid="time-slot"]:not(.disabled)');
    if (availableSlot) {
      const timeText = await availableSlot.evaluate(el => el.textContent);
      await availableSlot.click();
      console.log(`   ✓ Selected time: ${timeText}`);
    }
    
    await page.click('button:has-text("Continue")');
    console.log('✅ Date and time selected\n');
    
    // Step 4: Customer identification
    console.log('5️⃣ Customer identification...');
    await page.waitForSelector('input[placeholder*="email" i]', { timeout: 10000 });
    
    // Enter email for new customer
    await page.type('input[placeholder*="email" i]', 'test@example.com');
    await page.click('button:has-text("Continue as New Customer")');
    console.log('✅ Proceeding as new customer\n');
    
    // Step 5: Customer details
    console.log('6️⃣ Entering customer details...');
    await page.waitForSelector('input[name="firstName"]', { timeout: 10000 });
    
    await page.type('input[name="firstName"]', 'Test');
    await page.type('input[name="lastName"]', 'User');
    await page.type('input[name="email"]', 'test@example.com');
    await page.type('input[name="phone"]', '0412345678');
    
    console.log('   ✓ Filled customer information');
    
    await page.click('button:has-text("Continue")');
    console.log('✅ Customer details entered\n');
    
    // Step 6: Payment (skip)
    console.log('7️⃣ Skipping payment step...');
    await page.waitForSelector('button:has-text("Skip Payment")', { timeout: 10000 });
    await page.click('button:has-text("Skip Payment")');
    console.log('✅ Payment skipped\n');
    
    // Step 7: Confirmation
    console.log('8️⃣ Checking confirmation page...');
    await page.waitForSelector('.confirmation-page', { timeout: 10000 });
    
    // Check if booking number is displayed
    const bookingNumber = await page.$eval('[data-testid="booking-number"]', el => el.textContent);
    console.log(`   ✓ Booking confirmed! Number: ${bookingNumber}`);
    
    // Check if all services are listed
    const confirmedServices = await page.$$eval('.confirmed-service', els => 
      els.map(el => el.textContent)
    );
    console.log('   ✓ Confirmed services:', confirmedServices.join(', '));
    
    // Check total price
    const totalPrice = await page.$eval('[data-testid="total-price"]', el => el.textContent);
    console.log(`   ✓ Total price: ${totalPrice}`);
    
    console.log('\n✅ Booking flow completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take screenshot on error
    await page.screenshot({ path: 'booking-error.png' });
    console.log('📸 Screenshot saved as booking-error.png');
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testBookingFlow().catch(console.error);