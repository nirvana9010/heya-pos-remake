import { test, expect } from '@playwright/test';

test('API Search Direct Test', async ({ page }) => {
  // First, login and get auth token
  await page.goto('/login');
  await page.locator('button:has-text("Quick Login as Hamilton")').click();
  await page.waitForURL('**/calendar', { timeout: 10000 });
  
  // Get auth token from cookies
  const cookies = await page.context().cookies();
  const authCookie = cookies.find(c => c.name === 'auth-token');
  
  if (!authCookie) {
    console.log('❌ No auth token found');
    return;
  }
  
  // Make direct API calls
  console.log('🔍 Testing API directly with auth token...\n');
  
  // Search for "Lukas"
  const lukasResponse = await page.request.get('http://localhost:3000/api/v1/customers/search?q=Lukas', {
    headers: {
      'Cookie': `auth-token=${authCookie.value}`
    }
  });
  const lukasData = await lukasResponse.json();
  console.log(`Search "Lukas": ${lukasData.data.length} results`);
  if (lukasData.data.length > 0) {
    console.log(`  - ${lukasData.data[0].firstName} ${lukasData.data[0].lastName}`);
  }
  
  // Search for "Test"  
  const testResponse = await page.request.get('http://localhost:3000/api/v1/customers/search?q=Test', {
    headers: {
      'Cookie': `auth-token=${authCookie.value}`
    }
  });
  const testData = await testResponse.json();
  console.log(`\nSearch "Test": ${testData.data.length} results`);
  for (let i = 0; i < Math.min(3, testData.data.length); i++) {
    console.log(`  - ${testData.data[i].firstName} ${testData.data[i].lastName}`);
  }
  
  // Check why API returns only 1 result
  if (testData.data.length === 1 && lukasData.data.length === 1) {
    console.log('\n⚠️  API is returning only 1 result for both searches!');
    console.log('This suggests a backend issue, not a frontend caching issue.');
  }
});