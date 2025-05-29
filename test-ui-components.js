const puppeteer = require('puppeteer');

async function testUI() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    // Login first
    console.log('1. Logging in...');
    await page.goto('http://localhost:3002/login');
    await page.waitForSelector('input[id="username"]');
    
    await page.type('input[id="username"]', 'HAMILTON');
    await page.type('input[id="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation();
    console.log('✓ Logged in successfully');

    // Test Services page
    console.log('\n2. Testing Services page...');
    await page.goto('http://localhost:3002/services');
    await page.waitForSelector('button:has-text("Add Service")', { timeout: 5000 });
    
    // Check if dialog opens
    await page.click('button:has-text("Add Service")');
    await page.waitForTimeout(1000);
    
    const dialogVisible = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog !== null;
    });
    
    console.log('Dialog visible:', dialogVisible);
    
    // Check console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run test
testUI();