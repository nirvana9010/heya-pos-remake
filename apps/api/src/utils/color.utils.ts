// Staff calendar color palette - 16 distinct colors
// Carefully selected for maximum visual distinction
export const STAFF_CALENDAR_COLORS = [
  // High contrast primary colors
  '#DC2626', // Red-600 - Strong, attention-grabbing
  '#059669', // Emerald-600 - Deep green, very different from red
  '#2563EB', // Blue-600 - Classic blue, distinct from green
  '#EA580C', // Orange-600 - Warm, stands out from cool colors
  
  // Secondary colors with varied saturation
  '#7C3AED', // Violet-600 - Purple, different from primary colors
  '#0891B2', // Cyan-600 - Blue-green, bridge color
  '#DB2777', // Pink-600 - Vibrant pink, very distinctive
  '#CA8A04', // Yellow-600 - Earthy yellow, unique tone
  
  // Darker variants for contrast
  '#7C2D12', // Orange-800 - Dark brown-orange
  '#1E3A8A', // Blue-800 - Deep navy
  '#166534', // Green-800 - Forest green
  '#86198F', // Fuchsia-800 - Deep magenta
  
  // Lighter variants for variety
  '#60A5FA', // Blue-400 - Light blue, airy
  '#34D399', // Emerald-400 - Bright mint
  '#F472B6', // Pink-400 - Soft pink
  '#A78BFA', // Violet-400 - Lavender
];

/**
 * Convert hex color to HSL
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate a color variation by adjusting lightness
 * @param baseColor - The base hex color
 * @param variation - The variation index (0-based)
 * @returns A new hex color with adjusted lightness
 */
export function generateColorVariation(baseColor: string, variation: number): string {
  const hsl = hexToHSL(baseColor);
  
  // Adjust lightness based on variation
  // Even variations: lighter, Odd variations: darker
  const isLighter = variation % 2 === 0;
  const adjustmentStep = Math.floor(variation / 2) + 1;
  const adjustment = adjustmentStep * 5; // 5% per step
  
  let newLightness: number;
  if (isLighter) {
    newLightness = Math.min(85, hsl.l + adjustment); // Cap at 85% to maintain readability
  } else {
    newLightness = Math.max(25, hsl.l - adjustment); // Floor at 25% to maintain visibility
  }
  
  // Also slightly adjust saturation for more variation
  const saturationAdjustment = (variation % 3 - 1) * 5; // -5, 0, or +5
  const newSaturation = Math.max(20, Math.min(90, hsl.s + saturationAdjustment));
  
  return hslToHex(hsl.h, newSaturation, newLightness);
}

/**
 * Get the next available staff color
 * @param usedColors - Array of colors already in use
 * @param staffCount - Total number of staff (used for deterministic variation)
 * @returns The selected color hex code
 */
export function getNextStaffColor(usedColors: string[], staffCount: number): string {
  // First, try to find an unused color from the base palette
  const unusedBaseColors = STAFF_CALENDAR_COLORS.filter(
    color => !usedColors.includes(color.toLowerCase())
  );
  
  if (unusedBaseColors.length > 0) {
    // Return the first unused color for consistency
    return unusedBaseColors[0];
  }
  
  // All base colors are used, generate a variation
  // Use staff count to ensure deterministic color selection
  const baseColorIndex = staffCount % STAFF_CALENDAR_COLORS.length;
  const baseColor = STAFF_CALENDAR_COLORS[baseColorIndex];
  const variationIndex = Math.floor(staffCount / STAFF_CALENDAR_COLORS.length);
  
  return generateColorVariation(baseColor, variationIndex);
}