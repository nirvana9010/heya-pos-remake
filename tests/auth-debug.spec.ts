import { test, expect } from '@playwright/test';

test.describe('Authentication Debug', () => {
  test('Investigate login process step by step', async ({ page }) => {
    console.log('🔍 Starting detailed authentication debug...');

    // Enable request/response logging
    page.on('request', request => {
      if (request.url().includes('/login') || request.url().includes('/auth')) {
        console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
        if (request.postData()) {
          console.log(`📦 POST DATA: ${request.postData()}`);
        }
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/login') || response.url().includes('/auth')) {
        console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
        try {
          const text = await response.text();
          if (text.length < 500) {
            console.log(`📄 RESPONSE BODY: ${text}`);
          }
        } catch (e) {
          console.log('Could not read response body');
        }
      }
    });

    // Step 1: Navigate to login page
    console.log('🌐 Navigating to login page...');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    console.log(`📍 Current URL: ${page.url()}`);
    
    // Take screenshot of login page
    await page.screenshot({ path: 'auth-debug-1-login-page.png', fullPage: true });
    
    // Step 2: Analyze the login form
    console.log('🔍 Analyzing login form...');
    
    // Get all input fields
    const inputs = await page.locator('input').all();
    console.log(`📝 Found ${inputs.length} input fields:`);
    
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      console.log(`   ${i + 1}. type="${type}" name="${name}" placeholder="${placeholder}" id="${id}"`);
    }
    
    // Get all buttons
    const buttons = await page.locator('button').all();
    console.log(`🔘 Found ${buttons.length} buttons:`);
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const type = await button.getAttribute('type');
      const text = await button.textContent();
      console.log(`   ${i + 1}. type="${type}" text="${text}"`);
    }
    
    // Step 3: Try to fill and submit the form
    console.log('📝 Attempting to fill form...');
    
    // Find username field
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="email"]', 
      'input[type="text"]',
      'input[placeholder*="username" i]',
      'input[placeholder*="email" i]'
    ];
    
    let usernameField = null;
    for (const selector of usernameSelectors) {
      try {
        const field = page.locator(selector).first();
        if (await field.isVisible({ timeout: 1000 })) {
          usernameField = field;
          console.log(`✅ Found username field: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Find password field
    const passwordField = page.locator('input[type="password"]').first();
    const passwordVisible = await passwordField.isVisible();
    console.log(`🔑 Password field visible: ${passwordVisible}`);
    
    // Find submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign in")',
      'input[type="submit"]'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          submitButton = button;
          console.log(`✅ Found submit button: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!usernameField || !passwordVisible || !submitButton) {
      console.log('❌ Missing required form elements');
      return;
    }
    
    // Step 4: Try Quick Login first
    const quickLoginButton = page.locator('button:has-text("Quick Login as Hamilton")');
    if (await quickLoginButton.isVisible({ timeout: 1000 })) {
      console.log('🚀 Using Quick Login button...');
      await quickLoginButton.click();
    } else {
      // Fall back to manual form filling
      console.log('📝 Using manual form filling...');
      await usernameField.fill('HAMILTON');
      await passwordField.fill('demo123');
      
      // Take screenshot before submit
      await page.screenshot({ path: 'auth-debug-2-form-filled.png', fullPage: true });
      
      // Step 5: Submit the form
      console.log('🚀 Submitting form...');
      await submitButton.click();
    }
    
    // Wait for navigation/response
    await page.waitForTimeout(3000);
    
    console.log(`📍 URL after submit: ${page.url()}`);
    
    // Take screenshot after submit
    await page.screenshot({ path: 'auth-debug-3-after-submit.png', fullPage: true });
    
    // Step 6: Check for errors or success indicators
    const errorElements = await page.locator('.error, .alert-error, [class*="error"], .text-red').all();
    if (errorElements.length > 0) {
      console.log(`❌ Found ${errorElements.length} error elements:`);
      for (let i = 0; i < Math.min(3, errorElements.length); i++) {
        const text = await errorElements[i].textContent();
        console.log(`   Error ${i + 1}: ${text}`);
      }
    }
    
    // Check if we're still on login page
    if (page.url().includes('/login')) {
      console.log('⚠️  Still on login page - authentication may have failed');
      
      // Look for any validation messages
      const allText = await page.locator('body').textContent();
      if (allText && (allText.includes('invalid') || allText.includes('incorrect') || allText.includes('error'))) {
        console.log('❌ Found error text in page body');
      }
    } else {
      console.log('✅ Redirected away from login page - authentication may have succeeded');
    }
    
    console.log('🏁 Authentication debug completed');
  });
});