import { Page, Locator, expect } from '@playwright/test';

export interface CustomerSearchResult {
  name: string;
  email: string;
  phone: string;
}

export class BookingSlideout {
  readonly page: Page;
  readonly slideout: Locator;
  readonly customerSearchInput: Locator;
  readonly searchDropdown: Locator;
  readonly searchResults: Locator;
  readonly loadingIndicator: Locator;
  readonly nextButton: Locator;
  readonly closeButton: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.slideout = page.locator('[data-testid="booking-slideout"], .slideout, .booking-form').first();
    this.customerSearchInput = page.locator('input[placeholder*="Search"], input[placeholder*="customer"], [data-testid="customer-search"]');
    this.searchDropdown = page.locator('.absolute.z-50, [data-testid="search-dropdown"]').first();
    this.searchResults = page.locator('.absolute.z-50 button, [data-testid="search-result"]');
    this.loadingIndicator = page.locator('.animate-spin, [data-testid="loading"]');
    this.nextButton = page.locator('button:has-text("Next"), [data-testid="next-button"]');
    this.closeButton = page.locator('button:has-text("Close"), [data-testid="close-button"], button:has-text("×")');
  }

  async waitForSlideoutOpen() {
    console.log('🔍 Waiting for booking slideout to open...');
    
    // Wait for slideout to be visible
    await this.slideout.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for customer search input to be ready
    await this.customerSearchInput.waitFor({ state: 'visible', timeout: 5000 });
    
    // Ensure the input is not disabled
    await expect(this.customerSearchInput).toBeEnabled();
    
    console.log('✅ Booking slideout is open and ready');
  }

  async searchCustomer(query: string): Promise<CustomerSearchResult[]> {
    console.log(`🔍 Searching for customer: "${query}"`);
    
    // Clear any existing text and type the search query
    await this.customerSearchInput.fill('');
    await this.customerSearchInput.type(query, { delay: 50 }); // Simulate realistic typing
    
    // Wait for debounce (component uses 300ms)
    await this.page.waitForTimeout(350);
    
    // Wait for either search results or loading to appear
    await Promise.race([
      this.searchDropdown.waitFor({ state: 'visible', timeout: 5000 }),
      this.loadingIndicator.waitFor({ state: 'visible', timeout: 1000 }).catch(() => {
        // Loading might be too fast to catch
      })
    ]);
    
    // Wait for loading to finish
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
      // No loading indicator might mean it loaded instantly
    });
    
    // Check if dropdown is visible
    const isDropdownVisible = await this.searchDropdown.isVisible();
    console.log(`📋 Search dropdown visible: ${isDropdownVisible}`);
    
    if (!isDropdownVisible) {
      console.log('❌ Search dropdown is not visible');
      return [];
    }
    
    // Get search results
    const results = await this.getSearchResults();
    console.log(`📊 Found ${results.length} search results`);
    
    return results;
  }

  async getSearchResults(): Promise<CustomerSearchResult[]> {
    const results: CustomerSearchResult[] = [];
    
    // Wait a moment for results to render
    await this.page.waitForTimeout(100);
    
    const resultElements = await this.searchResults.all();
    console.log(`🔢 Found ${resultElements.length} result elements`);
    
    for (const element of resultElements) {
      try {
        const text = await element.textContent();
        if (!text) continue;
        
        // Parse the result text to extract customer info
        // Format might be like "John Doe - 0400123456" or have multiple lines
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        
        if (lines.length > 0) {
          const name = lines[0];
          let email = '';
          let phone = '';
          
          // Look for email and phone in the text
          for (const line of lines) {
            if (line.includes('@')) {
              email = line;
            } else if (line.match(/^\d{4}\s?\d{3}\s?\d{3}/) || line.match(/^04\d{8}/)) {
              phone = line;
            }
          }
          
          results.push({ name, email, phone });
        }
      } catch (error) {
        console.log('⚠️  Error parsing search result:', error);
      }
    }
    
    return results;
  }

  async selectCustomer(index: number = 0) {
    console.log(`👆 Selecting customer at index ${index}`);
    
    const resultElements = await this.searchResults.all();
    
    if (index >= resultElements.length) {
      throw new Error(`Cannot select customer at index ${index}. Only ${resultElements.length} results available.`);
    }
    
    await resultElements[index].click();
    
    // Wait for dropdown to close and form to update
    await this.searchDropdown.waitFor({ state: 'hidden', timeout: 5000 });
    
    console.log('✅ Customer selected');
  }

  async verifyCustomerSelected(expectedName: string) {
    // Check that the input now shows the selected customer
    const inputValue = await this.customerSearchInput.inputValue();
    expect(inputValue).toContain(expectedName);
  }

  async clearSearch() {
    await this.customerSearchInput.fill('');
    await this.page.waitForTimeout(100);
  }

  async verifySearchDropdownVisible() {
    await expect(this.searchDropdown).toBeVisible();
  }

  async verifySearchDropdownHidden() {
    await expect(this.searchDropdown).toBeHidden();
  }

  async getSearchInputValue() {
    return await this.customerSearchInput.inputValue();
  }

  async isSearching() {
    return await this.loadingIndicator.isVisible();
  }

  async waitForSearchComplete(timeout: number = 5000) {
    // Wait for loading to finish
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout }).catch(() => {
      // Might not have loading indicator
    });
    
    // Wait for dropdown to appear or for the search to complete
    await Promise.race([
      this.searchDropdown.waitFor({ state: 'visible', timeout: timeout }),
      this.page.waitForTimeout(1000) // Minimum wait
    ]);
  }

  async close() {
    await this.closeButton.click();
    await this.slideout.waitFor({ state: 'hidden', timeout: 5000 });
  }

  async proceedToNextStep() {
    await this.nextButton.click();
    await this.page.waitForTimeout(500);
  }
}