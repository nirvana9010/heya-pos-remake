export const isBlocksEnabled = (merchant: any): boolean => {
  if (merchant?.settings && merchant.settings.enableCalendarBlocks !== undefined) {
    return Boolean(merchant.settings.enableCalendarBlocks);
  }
  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(localStorage.getItem("merchant") || "{}");
      if (stored?.settings?.enableCalendarBlocks !== undefined) {
        return Boolean(stored.settings.enableCalendarBlocks);
      }
    } catch {
      // ignore parse errors
    }
  }
  return false;
};
