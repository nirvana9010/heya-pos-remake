const puppeteer = require('puppeteer');

async function testPuppeteer() {
  console.log('Testing Puppeteer setup...');
  
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions'
      ],
      timeout: 30000
    });
    
    console.log('Browser launched successfully!');
    
    const page = await browser.newPage();
    console.log('New page created');
    
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
    console.log('Navigation successful');
    
    const title = await page.title();
    console.log('Page title:', title);
    
    await browser.close();
    console.log('Browser closed successfully');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('Failed to launch')) {
      console.error('\nThis might be due to missing dependencies.');
      console.error('On Ubuntu/Debian, try running:');
      console.error('sudo apt-get update && sudo apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils');
    }
  }
}

testPuppeteer();