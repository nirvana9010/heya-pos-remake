import { test } from '@playwright/test';

test('Verify search fix', async ({ page }) => {
  console.log('🔍 Testing customer search fix...\n');
  
  // Navigate and login
  await page.goto('/calendar');
  if (page.url().includes('/login')) {
    const quickLogin = page.locator('button:has-text("Quick Login as Hamilton")');
    if (await quickLogin.isVisible()) {
      await quickLogin.click();
      await page.waitForTimeout(2000);
    }
  }
  
  // Open booking slideout
  const slot = page.locator('div.cursor-pointer').filter({ hasNot: page.locator('*') }).first();
  await slot.click();
  await page.waitForTimeout(1000);
  
  // Navigate to customer step
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await next.click(); // To service
  await page.waitForTimeout(500);
  
  await page.locator('button').filter({ has: page.locator('h4') }).first().click(); // Select service
  await page.waitForTimeout(500);
  
  await next.click(); // To customer
  await page.waitForTimeout(1000);
  
  const input = page.locator('input[placeholder*="Search customer"]');
  
  // Test 1: Search Lukas
  console.log('1️⃣ Search "Lukas"');
  await input.fill('Lukas');
  await page.waitForTimeout(2000);
  
  const lukas1 = await page.locator('button:has-text("Lukas Nguyen")').isVisible();
  console.log(`   Lukas visible: ${lukas1}`);
  
  // Clear
  console.log('\n🧹 Clear search');
  await input.clear();
  await page.waitForTimeout(1000);
  
  // Test 2: Search Test
  console.log('\n2️⃣ Search "Test"');
  await input.fill('Test');  
  await page.waitForTimeout(2000);
  
  const lukas2 = await page.locator('button:has-text("Lukas Nguyen")').isVisible();
  const hasTest = await page.locator('button').filter({ hasText: /@.*test/i }).count() > 0;
  
  console.log(`   Lukas still visible: ${lukas2}`);
  console.log(`   Test results found: ${hasTest}`);
  
  // Result
  console.log('\n📊 RESULT:');
  if (!lukas2 && hasTest) {
    console.log('   ✅ FIXED! Search updates correctly');
  } else if (lukas2) {
    console.log('   ❌ NOT FIXED - Still showing Lukas');
  } else {
    console.log('   ⚠️  No results shown');
  }
  
  await page.screenshot({ path: 'screenshots/verify-fix.png' });
});