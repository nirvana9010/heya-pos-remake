import { test, expect } from '@playwright/test';

test('Minimal Search Test', async ({ page }) => {
  // Go directly to calendar (will redirect to login if needed)
  await page.goto('/calendar');
  
  // Quick login if needed
  if (page.url().includes('/login')) {
    await page.locator('button:has-text("Quick Login as Hamilton")').click();
    await page.waitForTimeout(2000);
  }
  
  // Click time slot
  await page.locator('div.cursor-pointer.h-\\[60px\\]').first().click();
  await page.waitForTimeout(1000);
  
  // Go to service step
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.waitForTimeout(500);
  
  // Select service
  await page.locator('button:has(h4)').first().click();
  await page.waitForTimeout(500);
  
  // Go to customer step
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.waitForTimeout(1000);
  
  const searchInput = page.locator('input[placeholder*="Search customers"]');
  
  // Search 1: Lukas
  console.log('\n1️⃣ Searching for "Lukas"');
  await searchInput.fill('Lukas');
  await page.waitForTimeout(2000);
  
  // Check what's visible
  const lukasVisible = await page.locator('text="Lukas Nguyen"').isVisible();
  console.log(`   Lukas visible: ${lukasVisible}`);
  
  // Take screenshot
  await page.screenshot({ path: 'screenshots/search-1-lukas.png' });
  
  // Clear
  console.log('\n🧹 Clearing search');
  await searchInput.clear();
  await page.waitForTimeout(1000);
  
  // Search 2: Test
  console.log('\n2️⃣ Searching for "Test"');
  await searchInput.fill('Test');
  await page.waitForTimeout(2000);
  
  // Check what's visible now
  const lukasStillVisible = await page.locator('text="Lukas Nguyen"').isVisible();
  const testVisible = await page.locator('text=/Test/i').isVisible();
  
  console.log(`   Lukas still visible: ${lukasStillVisible}`);
  console.log(`   Test results visible: ${testVisible}`);
  
  // Take screenshot
  await page.screenshot({ path: 'screenshots/search-2-test.png' });
  
  // Final verdict
  console.log('\n📊 Result:');
  if (lukasStillVisible && !testVisible) {
    console.log('   ❌ BUG CONFIRMED: Shows Lukas when searching for Test');
  } else if (!lukasStillVisible && testVisible) {
    console.log('   ✅ FIXED: Search works correctly');
  } else {
    console.log('   ⚠️  Unclear state');
  }
});