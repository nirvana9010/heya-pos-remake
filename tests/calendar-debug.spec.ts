import { test, expect } from '@playwright/test';
import { AuthUtils } from './utils/auth';

test.describe('Calendar Page Debug', () => {
  test('Investigate calendar page structure', async ({ browser }) => {
    const context = await AuthUtils.getAuthenticatedContext(browser);
    const page = await context.newPage();

    console.log('🧪 Debugging calendar page structure...');

    try {
      // Navigate to calendar
      await page.goto('/calendar');
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      
      console.log(`📍 Current URL: ${page.url()}`);
      
      // Take a screenshot
      await page.screenshot({ path: 'calendar-debug.png', fullPage: true });
      console.log('📸 Screenshot saved as calendar-debug.png');
      
      // Get page title
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);
      
      // Look for any calendar-related elements
      const possibleSelectors = [
        '[data-testid="calendar-grid"]',
        '.calendar-grid',
        '.calendar-container',
        '[data-testid="calendar"]',
        '.calendar',
        '.fc-view', // FullCalendar
        '.react-calendar',
        '[class*="calendar"]',
        '[class*="Calendar"]',
        '[id*="calendar"]',
        '[id*="Calendar"]'
      ];
      
      for (const selector of possibleSelectors) {
        try {
          const element = page.locator(selector);
          const count = await element.count();
          if (count > 0) {
            console.log(`✅ Found ${count} elements with selector: ${selector}`);
            const isVisible = await element.first().isVisible();
            console.log(`   - Visible: ${isVisible}`);
          }
        } catch (e) {
          // Selector didn't work, continue
        }
      }
      
      // Get all elements with "calendar" in their class or id
      const calendarElements = await page.locator('[class*="calendar" i], [id*="calendar" i]').all();
      console.log(`🔍 Found ${calendarElements.length} elements with "calendar" in class/id`);
      
      for (let i = 0; i < Math.min(5, calendarElements.length); i++) {
        const element = calendarElements[i];
        const tagName = await element.evaluate(el => el.tagName);
        const className = await element.evaluate(el => el.className);
        const id = await element.evaluate(el => el.id);
        console.log(`   ${i + 1}. ${tagName} class="${className}" id="${id}"`);
      }
      
      // Check for any loading states
      const loading = await page.locator('[class*="loading" i], [data-loading="true"]').count();
      console.log(`⏳ Loading elements found: ${loading}`);
      
      // Check for error messages
      const errors = await page.locator('[class*="error" i], .alert-error, .error-message').count();
      console.log(`❌ Error elements found: ${errors}`);
      
      // Get page content for investigation
      const bodyText = await page.locator('body').textContent();
      const hasCalendarText = bodyText?.toLowerCase().includes('calendar');
      console.log(`📝 Page contains "calendar" text: ${hasCalendarText}`);
      
      if (bodyText && bodyText.length < 500) {
        console.log(`📄 Page body text: ${bodyText.slice(0, 200)}...`);
      }
      
      console.log('✅ Calendar debug completed');
      
    } catch (error) {
      console.error('❌ Calendar debug failed:', error);
      
      // Take screenshot anyway
      try {
        await page.screenshot({ path: 'calendar-error-debug.png', fullPage: true });
        console.log('📸 Error screenshot saved as calendar-error-debug.png');
      } catch (screenshotError) {
        console.log('Could not take error screenshot');
      }
      
      throw error;
    } finally {
      await page.close();
    }
  });
});