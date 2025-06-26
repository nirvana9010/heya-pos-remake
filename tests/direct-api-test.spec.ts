import { test, expect } from '@playwright/test';

test.describe('Direct API Test', () => {
  test('Test customer search API directly from browser console', async ({ page }) => {
    // Navigate to calendar (after auth)
    console.log('🔍 Navigating to calendar...');
    await page.goto('/calendar', { waitUntil: 'networkidle' });
    
    // Check if we need to login
    if (page.url().includes('/login')) {
      const quickLoginButton = page.locator('button:has-text("Quick Login as Hamilton")');
      if (await quickLoginButton.isVisible({ timeout: 2000 })) {
        await quickLoginButton.click();
        await page.waitForURL('**/calendar', { timeout: 10000 });
      }
    }
    
    // Wait for page to stabilize
    await page.waitForTimeout(2000);
    
    // Execute API call directly in browser context
    console.log('🔬 Testing API client directly in browser...');
    
    const result = await page.evaluate(async () => {
      try {
        // Check if apiClient is available globally
        // @ts-ignore
        const hasGlobalApiClient = typeof window.apiClient !== 'undefined';
        
        // Try to import apiClient if not global
        let apiClient;
        if (!hasGlobalApiClient) {
          // Try to get it from the merchant app context
          // This won't work directly, but let's see what happens
          console.log('apiClient not found globally');
          return {
            error: 'apiClient not available globally',
            hasGlobalApiClient: false
          };
        } else {
          // @ts-ignore
          apiClient = window.apiClient;
        }
        
        console.log('Starting customer search test...');
        
        // Test the search
        const searchResult = await apiClient.searchCustomers('test');
        
        return {
          success: true,
          hasGlobalApiClient,
          searchResult,
          resultCount: searchResult?.data?.length || 0
        };
      } catch (error: any) {
        return {
          error: error.message,
          stack: error.stack,
          hasGlobalApiClient: false
        };
      }
    });
    
    console.log('🔍 Browser evaluation result:', JSON.stringify(result, null, 2));
    
    // Now test via the UI to see what happens
    console.log('\n📱 Testing via UI interaction...');
    
    // Open developer console and inject our test
    const consoleResult = await page.evaluate(() => {
      // Create a promise to capture console logs
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = (...args) => {
        logs.push(`[LOG] ${args.join(' ')}`);
        originalLog.apply(console, args);
      };
      
      console.error = (...args) => {
        logs.push(`[ERROR] ${args.join(' ')}`);
        originalError.apply(console, args);
      };
      
      // Simulate what happens in CustomerSearchInput
      const testSearch = async () => {
        try {
          console.log('🔍 CustomerSearchInput: Starting search for: test');
          
          // Try to access apiClient through module system
          // This simulates what the React component would do
          const apiClientModule = (window as any).__apiClient || null;
          console.log('🔍 CustomerSearchInput: apiClient available?', !!apiClientModule);
          
          if (!apiClientModule) {
            throw new Error('apiClient module not found');
          }
          
          console.log('🔍 CustomerSearchInput: apiClient.searchCustomers available?', !!apiClientModule?.searchCustomers);
          
          const response = await apiClientModule.searchCustomers('test');
          console.log('✅ CustomerSearchInput: API call succeeded, response:', response);
          
          return { success: true, response, logs };
        } catch (error: any) {
          console.error('❌ CustomerSearchInput: Customer search failed:', error);
          console.error('❌ CustomerSearchInput: Error details:', {
            message: error?.message,
            stack: error?.stack
          });
          
          return { success: false, error: error.message, logs };
        }
      };
      
      return testSearch();
    });
    
    console.log('\n📋 Console simulation result:', JSON.stringify(consoleResult, null, 2));
    
    // Try one more approach - check if the search input exists and what happens when we type
    const searchInput = await page.$('input[placeholder*="Search customers"]');
    if (searchInput) {
      console.log('\n🔍 Found search input on page, checking its behavior...');
      
      // Get the React component instance if possible
      const componentInfo = await page.evaluate((el) => {
        // @ts-ignore
        const reactKey = Object.keys(el).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
        if (reactKey) {
          // @ts-ignore
          const fiber = el[reactKey];
          return {
            hasReactFiber: true,
            componentName: fiber?.elementType?.name || 'Unknown',
            props: fiber?.memoizedProps || {}
          };
        }
        return { hasReactFiber: false };
      }, searchInput);
      
      console.log('📊 React component info:', JSON.stringify(componentInfo, null, 2));
    }
  });
});