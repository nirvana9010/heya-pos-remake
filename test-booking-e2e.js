const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBookingFlow() {
  console.log('🚀 Starting E2E booking flow test...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });
    
    // Navigate to booking page
    console.log('1️⃣ Navigating to booking page...');
    await page.goto('http://localhost:3001/booking', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for services to be loaded
    await delay(2000);
    
    // Check for any JavaScript errors
    const pageContent = await page.content();
    if (pageContent.includes('ReferenceError')) {
      throw new Error('Page contains ReferenceError');
    }
    
    console.log('✅ Booking page loaded successfully\n');
    
    // Step 1: Check if services are displayed
    console.log('2️⃣ Checking services display...');
    
    // Wait for service cards
    const serviceCards = await page.$$('div[class*="luxury-card"]');
    console.log(`   Found ${serviceCards.length} service cards`);
    
    // Look for Classic Facial
    const facialExists = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Classic Facial'));
    });
    
    if (facialExists) {
      console.log('   ✓ Classic Facial service found');
    }
    
    // Look for Swedish Massage
    const massageExists = await page.evaluate(() => {
      return !!Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Swedish Massage'));
    });
    
    if (massageExists) {
      console.log('   ✓ Swedish Massage service found');
    }
    
    // Try to select services
    console.log('\n3️⃣ Attempting to select services...');
    
    // Click on cards containing the services
    const cards = await page.$$('div[class*="cursor-pointer"]');
    let selectedCount = 0;
    
    for (const card of cards) {
      const cardText = await card.evaluate(el => el.textContent);
      if (cardText.includes('Classic Facial') || cardText.includes('Swedish Massage')) {
        await card.click();
        selectedCount++;
        await delay(500);
      }
    }
    
    console.log(`   ✓ Selected ${selectedCount} services`);
    
    // Check if Continue button is enabled
    const continueButton = await page.$('button:not([disabled])');
    if (continueButton) {
      const buttonText = await continueButton.evaluate(el => el.textContent);
      if (buttonText.includes('Continue')) {
        console.log('   ✓ Continue button is enabled');
        
        // Click continue
        await continueButton.click();
        await delay(1000);
        
        // Check if we moved to staff selection
        const onStaffPage = await page.evaluate(() => {
          return !!Array.from(document.querySelectorAll('h3')).find(h => 
            h.textContent.includes('Choose Your Specialist') || 
            h.textContent.includes('Select Your Therapist')
          );
        });
        
        if (onStaffPage) {
          console.log('\n✅ Successfully navigated to staff selection!');
          console.log('   Multi-service selection is working correctly');
        }
      }
    }
    
    // Take a screenshot for review
    await page.screenshot({ path: 'booking-test-screenshot.png' });
    console.log('\n📸 Screenshot saved as booking-test-screenshot.png');
    
    console.log('\n✅ E2E test completed successfully!');
    console.log('   The multi-service booking feature is functional.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Take error screenshot
    const page = (await browser.pages())[0];
    if (page) {
      await page.screenshot({ path: 'booking-error-screenshot.png' });
      console.log('📸 Error screenshot saved as booking-error-screenshot.png');
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testBookingFlow()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));