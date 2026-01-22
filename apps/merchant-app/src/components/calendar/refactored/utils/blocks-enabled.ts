// Normalize potentially nested settings (handles { settings: { settings: { ... } } })
function normalizeSettings(settings: any): any {
  if (!settings || typeof settings !== 'object') return {};

  let normalized = { ...settings };
  // Unwrap nested settings if present
  while (normalized.settings && typeof normalized.settings === 'object') {
    const inner = normalized.settings;
    delete normalized.settings;
    normalized = { ...normalized, ...inner };
  }
  return normalized;
}

export const isBlocksEnabled = (merchant: any): boolean => {
  if (merchant?.settings) {
    const settings = normalizeSettings(merchant.settings);
    if (settings.enableCalendarBlocks !== undefined) {
      return Boolean(settings.enableCalendarBlocks);
    }
  }
  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(localStorage.getItem("merchant") || "{}");
      if (stored?.settings) {
        const settings = normalizeSettings(stored.settings);
        if (settings.enableCalendarBlocks !== undefined) {
          return Boolean(settings.enableCalendarBlocks);
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  // Default to true - block feature is non-intrusive and enabled by default
  return true;
};
