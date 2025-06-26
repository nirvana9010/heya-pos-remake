import { Browser, BrowserContext } from '@playwright/test';
import * as path from 'path';

export class AuthUtils {
  static async getAuthenticatedContext(browser: Browser): Promise<BrowserContext> {
    const authFile = path.join(__dirname, '..', 'auth.json');
    
    try {
      // Create context with stored authentication state
      const context = await browser.newContext({
        storageState: authFile
      });
      
      return context;
    } catch (error) {
      console.error('Failed to load authentication state:', error);
      
      // Fallback: create fresh context and authenticate
      const context = await browser.newContext();
      await this.authenticateContext(context);
      return context;
    }
  }

  static async authenticateContext(context: BrowserContext): Promise<void> {
    const page = await context.newPage();
    
    try {
      // Navigate to login page
      await page.goto('/login');
      
      // Fill in credentials
      await page.fill('input[name="username"], input[type="text"]', 'HAMILTON');
      await page.fill('input[name="password"], input[type="password"]', 'demo123');
      
      // Submit form
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign")');
      
      // Wait for successful login (redirect to calendar)
      await page.waitForURL('**/calendar', { timeout: 10000 });
      
      console.log('✅ Successfully authenticated in context');
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  static async verifyAuthentication(context: BrowserContext): Promise<boolean> {
    const page = await context.newPage();
    
    try {
      await page.goto('/calendar');
      
      // Check if we're redirected to login (meaning not authenticated)
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      
      if (currentUrl.includes('/login')) {
        return false;
      }
      
      // Check for authenticated UI elements
      const isCalendarVisible = await page.locator('.calendar-grid, .calendar-container, [data-testid="calendar"]').isVisible();
      
      return isCalendarVisible;
    } catch (error) {
      return false;
    } finally {
      await page.close();
    }
  }
}