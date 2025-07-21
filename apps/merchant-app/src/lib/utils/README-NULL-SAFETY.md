# Null Safety Guidelines for Customer Data

## Problem
React controlled inputs throw errors when their `value` prop is `null`. This commonly happens with customer data where fields like `lastName`, `email`, `phone` might be null in the database.

## Solution
Always use the utility functions from `form-utils.ts` when working with customer form data:

```typescript
import { safeCustomerFormData, safeLoyaltyFormData, safeString } from '@/lib/utils/form-utils';

// For entire customer objects
const formData = safeCustomerFormData(customer);

// For individual fields
const email = safeString(customer.email);
```

## Patterns to Follow

### ✅ Good - Safe patterns
```typescript
// Using utility functions
<Input value={safeString(customer.email)} />

// With fallback
<Input value={customer.email || ''} />

// Conditional rendering
{customer.email && <Input value={customer.email} />}
```

### ❌ Bad - Will cause errors
```typescript
// Direct usage without null check
<Input value={customer.email} />

// Assuming fields exist
<Input value={customer.lastName} />
```

## Key Rules
1. **Always assume customer fields can be null** - Even if TypeScript says otherwise
2. **Use safeString() for all text inputs** - Converts null/undefined to empty string
3. **Use safeNumber() for numeric inputs** - Converts null/undefined to 0
4. **Update interfaces to reflect reality** - Mark optional fields as `string | null | undefined`

## Common Customer Fields That Can Be Null
- lastName
- email  
- phone/mobile
- notes
- address fields
- Any custom fields

## Checklist for New Customer Forms
- [ ] Import safeCustomerFormData utility
- [ ] Use safeString() for all text inputs
- [ ] Use safeNumber() for all numeric inputs
- [ ] Test with customers that have missing fields
- [ ] Handle null values in display components