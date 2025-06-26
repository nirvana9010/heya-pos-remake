import { Page, Locator, expect } from '@playwright/test';

export class CalendarPage {
  readonly page: Page;
  readonly calendarGrid: Locator;
  readonly monthlyViewButton: Locator;
  readonly weeklyViewButton: Locator;
  readonly dailyViewButton: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.calendarGrid = page.locator('[data-testid="calendar-grid"], .calendar-grid').first();
    this.monthlyViewButton = page.locator('button:has-text("Monthly")');
    this.weeklyViewButton = page.locator('button:has-text("Weekly")');
    this.dailyViewButton = page.locator('button:has-text("Daily")');
  }

  async goto() {
    await this.page.goto('/calendar');
    await this.waitForCalendarLoad();
  }

  async waitForCalendarLoad() {
    // Wait for calendar to be visible and loaded
    await this.page.waitForSelector('[data-testid="calendar-grid"], .calendar-grid, .calendar-container', {
      timeout: 10000
    });
    
    // Wait for any loading indicators to disappear
    await this.page.waitForFunction(() => {
      const loadingIndicators = document.querySelectorAll('.loading, [data-loading="true"]');
      return loadingIndicators.length === 0;
    }, { timeout: 5000 }).catch(() => {
      // Ignore timeout - proceed anyway
    });
    
    // Small delay to ensure everything is settled
    await this.page.waitForTimeout(1000);
  }

  async switchToWeeklyView() {
    await this.weeklyViewButton.click();
    await this.waitForCalendarLoad();
  }

  async switchToDailyView() {
    await this.dailyViewButton.click();
    await this.waitForCalendarLoad();
  }

  async switchToMonthlyView() {
    await this.monthlyViewButton.click();
    await this.waitForCalendarLoad();
  }

  async clickEmptyTimeSlot(options?: { hour?: number; date?: string }) {
    // Default to a time slot that should be empty (e.g., 2 PM today)
    const hour = options?.hour || 14;
    const date = options?.date || new Date().toISOString().split('T')[0];
    
    // Try multiple selectors to find time slots
    const selectors = [
      `[data-time="${hour}:00"]`,
      `[data-hour="${hour}"]`,
      `.time-slot[data-time*="${hour}"]`,
      `.calendar-slot:has-text("${hour}:00")`,
      `.calendar-slot:has-text("2:00")`, // fallback to 2 PM
      '.calendar-slot:not(:has(.booking))', // any empty slot
    ];
    
    let timeSlotClicked = false;
    
    for (const selector of selectors) {
      try {
        const timeSlot = this.page.locator(selector).first();
        
        if (await timeSlot.isVisible({ timeout: 2000 })) {
          await timeSlot.click();
          timeSlotClicked = true;
          console.log(`✅ Clicked time slot using selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Try next selector
        continue;
      }
    }
    
    // If specific selectors didn't work, try clicking any visible empty area
    if (!timeSlotClicked) {
      try {
        // Look for any clickable calendar area
        const calendarArea = this.page.locator('.calendar-grid, .calendar-container, [data-testid="calendar"]').first();
        const box = await calendarArea.boundingBox();
        
        if (box) {
          // Click in the middle-right area of the calendar (likely an empty slot)
          await this.page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.4);
          timeSlotClicked = true;
          console.log('✅ Clicked calendar area as fallback');
        }
      } catch (error) {
        throw new Error(`Failed to click any time slot. Tried selectors: ${selectors.join(', ')}`);
      }
    }
    
    if (!timeSlotClicked) {
      throw new Error('Could not find any clickable time slot');
    }
    
    // Wait a moment for any slideout or modal to appear
    await this.page.waitForTimeout(500);
  }

  async getTodayEmptySlots() {
    // Return list of available time slots for today
    const slots = await this.page.locator('.calendar-slot:not(:has(.booking))').all();
    return slots.length;
  }

  async verifyCalendarVisible() {
    await expect(this.calendarGrid.or(this.page.locator('.calendar-container'))).toBeVisible();
  }
}