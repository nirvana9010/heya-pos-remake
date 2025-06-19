#!/usr/bin/env node

/**
 * Verify reports page is working without errors
 */

const puppeteer = require('puppeteer');

async function verifyReportsPage() {
  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Listen for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // First login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3002/login');
    await page.waitForSelector('input[name="username"]');
    
    await page.type('input[name="username"]', 'HAMILTON');
    await page.type('input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation();
    console.log('✓ Login successful');
    
    // Navigate to reports page
    console.log('\n2. Navigating to reports page...');
    await page.goto('http://localhost:3002/reports');
    
    // Wait for content to load
    await page.waitForSelector('h1', { timeout: 5000 });
    
    // Check for specific error
    const pageContent = await page.content();
    const hasMonthlyError = pageContent.includes("Cannot read properties of undefined (reading 'monthly')");
    const hasTypeError = pageContent.includes("TypeError");
    
    console.log('\n3. Results:');
    console.log(`   - Monthly error present: ${hasMonthlyError ? 'YES ❌' : 'NO ✓'}`);
    console.log(`   - TypeError present: ${hasTypeError ? 'YES ❌' : 'NO ✓'}`);
    console.log(`   - Console errors: ${errors.length > 0 ? errors.join(', ') : 'None ✓'}`);
    
    // Check if revenue cards are displaying
    const revenueCard = await page.$eval('h3.text-3xl', el => el.textContent).catch(() => null);
    console.log(`   - Revenue card displays: ${revenueCard ? `YES ✓ (${revenueCard})` : 'NO ❌'}`);
    
    if (!hasMonthlyError && !hasTypeError && errors.length === 0) {
      console.log('\n✅ Reports page is working correctly!');
    } else {
      console.log('\n❌ Reports page still has errors');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  verifyReportsPage();
} catch (e) {
  console.log('Puppeteer not installed. Using simple HTTP check instead...\n');
  
  // Fallback to simple HTTP check
  const http = require('http');
  
  http.get('http://localhost:3002/reports', (res) => {
    console.log(`Reports page HTTP status: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
      console.log('✓ Reports page is accessible');
      console.log('\nNote: Install puppeteer for full error checking:');
      console.log('  npm install puppeteer');
    } else {
      console.log('✗ Reports page returned error status');
    }
  }).on('error', (err) => {
    console.error('Could not access reports page:', err.message);
  });
}