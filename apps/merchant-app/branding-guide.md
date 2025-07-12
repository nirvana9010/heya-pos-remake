# Heya POS Branding Guide

This guide documents the design patterns and branding elements used throughout the Heya POS merchant application.

## Color Palette

### Primary Colors
- **Primary Teal**: `#0F766E` / `bg-teal-600` - Primary CTAs and important actions
- **Primary Hover**: `#134E4A` / `hover:bg-teal-700` - Hover state for primary elements
- **Primary Light**: `bg-teal-50` with `text-teal-700` - Selected states and highlights
- **Primary Border**: `border-teal-200` - Teal-tinted borders for emphasis

### Background Colors
- **Main Background**: `#F0FFF4` - Soft mint background
- **Secondary Background**: `#E6FFFA` - Soft teal for alternate sections
- **Surface/Cards**: `#FFFFFF` - White for cards and overlays
- **Gray Background**: `bg-gray-50` - Subtle background for nested content

### Text Colors
- **Primary Text**: `#0F172A` / `text-gray-900` - Main content text
- **Secondary Text**: `#334155` / `text-gray-700` - Secondary content
- **Tertiary Text**: `#64748B` / `text-gray-500` - Metadata and hints
- **Text on Dark**: `#FFFFFF` / `text-white` - Text on dark backgrounds

### Functional Colors
- **Success**: `#059669` / `text-green-600`
- **Warning**: `#F59E0B` / `text-orange-600`
- **Error**: `#DC2626` / `text-red-600`
- **Info**: `#0891B2` / `text-blue-600`

### Border & Shadow
- **Default Border**: `border-gray-200` - Standard borders
- **Focus Ring**: `focus:ring-2 focus:ring-teal-600`
- **Shadow**: `shadow-sm` for cards, `shadow-xl` for slideouts

## Typography

### Font Stack
```css
font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Text Sizes
- **Page Titles**: `text-2xl font-semibold`
- **Section Headers**: `text-xl font-semibold`
- **Card Headers**: `text-lg font-semibold`
- **Labels**: `text-sm font-medium text-gray-700`
- **Body Text**: `text-sm text-gray-600`
- **Small Text**: `text-xs text-gray-500`

### Font Weights
- **Regular**: `font-normal` (400)
- **Medium**: `font-medium` (500)
- **Semibold**: `font-semibold` (600)
- **Bold**: `font-bold` (700)

## Component Patterns

### Buttons

#### Primary Button
```tsx
<Button className="bg-teal-600 hover:bg-teal-700 text-white">
  Primary Action
</Button>
```

#### Secondary Button
```tsx
<Button variant="outline">
  Secondary Action
</Button>
```

#### Ghost Button
```tsx
<Button variant="ghost">
  Tertiary Action
</Button>
```

#### Destructive Button
```tsx
<Button variant="destructive">
  Delete
</Button>
```

### Cards
```tsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  {/* Card content */}
</div>
```

### Badges
```tsx
// Default badge
<Badge variant="secondary">Category</Badge>

// Status badges
<Badge className="bg-green-100 text-green-700">Active</Badge>
<Badge className="bg-gray-100 text-gray-700">Inactive</Badge>
```

### Form Elements

#### Input Fields
```tsx
<div>
  <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1.5 block">
    Field Label
  </Label>
  <Input 
    id="name" 
    placeholder="Placeholder text"
    className="w-full"
  />
</div>
```

#### Select Dropdowns
```tsx
<Select>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

### Layout Patterns

#### Sticky Header
```tsx
<div className="sticky top-0 z-20 bg-white border-b px-8 py-6">
  <h2 className="text-2xl font-semibold text-gray-900">Header Title</h2>
</div>
```

#### Section Spacing
```tsx
<div className="space-y-8">
  <section className="space-y-4">
    {/* Section content */}
  </section>
</div>
```

#### Grid Layouts
- **2 columns**: `grid grid-cols-2 gap-4`
- **3 columns**: `grid grid-cols-3 gap-4`
- **Responsive**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

### Slideout Panels
```tsx
<div className="fixed inset-y-0 right-0 flex max-w-full pl-10 z-50">
  <div className="w-screen max-w-md">
    <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
      {/* Header */}
      <div className="px-4 py-6 sm:px-6 border-b">
        {/* Content */}
      </div>
      
      {/* Body */}
      <div className="flex-1 px-4 py-6 sm:px-6">
        {/* Content */}
      </div>
      
      {/* Footer */}
      <div className="px-4 py-4 sm:px-6 border-t">
        {/* Actions */}
      </div>
    </div>
  </div>
</div>
```

## Interactive States

### Hover States
- **Cards**: `hover:shadow-md transition-shadow`
- **List Items**: `hover:bg-gray-50`
- **Clickable Elements**: `cursor-pointer`

### Focus States
- **Inputs**: `focus:ring-2 focus:ring-teal-600 focus:border-teal-600`
- **Buttons**: `focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600`

### Selected States
- **List Items**: `bg-teal-50 text-teal-700`
- **Tabs**: `border-b-2 border-teal-600`

### Loading States
```tsx
import { Spinner } from '@heya-pos/ui';

<Spinner className="h-4 w-4" />
```

## Icons
Using Lucide React icons throughout:
- **Size**: Default `h-4 w-4` for inline, `h-5 w-5` for buttons
- **Color**: Match text color or use `text-gray-400` for subtle icons

## Accessibility
- Always include proper labels for form fields
- Use semantic HTML elements
- Maintain color contrast ratios (WCAG AA)
- Include focus indicators for keyboard navigation
- Add `aria-label` for icon-only buttons

## Common Patterns

### Empty States
```tsx
<div className="text-center py-12">
  <Icon className="mx-auto h-12 w-12 text-gray-400" />
  <h3 className="mt-2 text-sm font-semibold text-gray-900">No items</h3>
  <p className="mt-1 text-sm text-gray-500">Get started by creating a new item.</p>
  <Button className="mt-4">Create Item</Button>
</div>
```

### Error Messages
```tsx
<div className="text-sm text-red-600 mt-1">
  Error message here
</div>
```

### Success Feedback
```tsx
import { SuccessCheck } from '@heya-pos/ui';

<SuccessCheck className="h-4 w-4" />
```