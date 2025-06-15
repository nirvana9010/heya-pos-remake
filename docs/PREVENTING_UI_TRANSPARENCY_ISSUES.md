# Preventing UI Transparency Issues

## Problem
Recurring issues with transparent dropdowns, invisible switches, and other UI components not displaying correctly. This happens because shadcn/ui components depend on specific CSS variables being defined.

## Root Cause
shadcn/ui components like Select, Switch, Dialog, etc. use Tailwind utility classes (e.g., `bg-popover`, `bg-input`, `border-input`) that must be mapped to CSS variables. Without proper Tailwind configuration, these classes don't generate any CSS, making components transparent or invisible.

**The REAL Issue**: Missing Tailwind configuration! The app's `tailwind.config.ts` must include:
1. Color mappings that connect utility classes to CSS variables
2. The `tailwindcss-animate` plugin for animations
3. Proper theme extensions for shadcn/ui components

**Common Misdiagnoses**: 
1. Thinking it's a CSS variable problem (the variables can be correct but unused!)
2. Multiple `:root` declarations (a red herring if Tailwind config is missing)
3. Incorrect CSS variable values (won't matter if Tailwind doesn't map the classes)

## Solution

### 1. Configure Tailwind Properly (MOST IMPORTANT!)
Add the UI package preset to your app's `tailwind.config.ts`:

```typescript
// tailwind.config.ts
export default {
  // ... your config ...
  presets: [require('../../packages/ui/tailwind.config')]
}
```

Or manually add the required configuration:
```typescript
theme: {
  extend: {
    colors: {
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      ring: "hsl(var(--ring))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      // ... all other color mappings
    }
  }
}
```

### 2. Include Required CSS Variables
Ensure these variables are defined in your globals.css:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    /* ... other required variables ... */
  }
}
```

### 2. Use the Shared Base CSS
Import the shared base CSS in your app's globals.css:

```css
@import '@heya/ui/shadcn-base.css';
```

### 3. Checklist for New UI Components
When adding new shadcn/ui components:
- [ ] Verify globals.css includes all required CSS variables
- [ ] Test in both light and dark modes (if applicable)
- [ ] Check hover states and focus states
- [ ] Verify z-index values for dropdowns and modals

### 4. Common Components That Need These Variables
- Select/Dropdown (--popover, --popover-foreground)
- Switch (--background, --foreground, --primary)
- Dialog/Modal (--background, --foreground)
- Tooltip (--popover, --popover-foreground)
- Command Palette (--popover, --popover-foreground)

## Quick Fix
If you encounter transparency issues:
1. Check if globals.css has the required shadcn/ui variables
2. Add missing variables from packages/ui/src/shadcn-base.css
3. Ensure CSS layers are properly ordered (@layer base should come first)

## Prevention
1. Use the UI package's base styles as a template
2. Run visual tests after adding new components
3. Document any custom CSS variable overrides
4. Keep shadcn/ui components updated together

## Example Fix
```css
/* Before - Missing variables */
@layer base {
  :root {
    /* Custom theme variables only */
    --color-primary: #0F766E;
  }
}

/* After - Includes required variables */
@layer base {
  :root {
    /* SHADCN/UI REQUIRED VARIABLES */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    
    /* Custom theme variables */
    --color-primary: #0F766E;
  }
}
```