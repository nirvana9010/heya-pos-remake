# Utility: [UTILITY_NAME]

**Created**: [DATE]  
**Location**: `[filepath]`  
**Used By**: [List 2-3 main consumers]

## 🎯 What It Does

[One paragraph explaining the purpose and problem it solves]

## 📖 How to Use

### Basic Usage
```typescript
import { utilityName } from '@/utils/utility-name';

// Basic example
const result = utilityName(input);
```

### Common Patterns
```typescript
// Pattern 1: [Description]
const example1 = utilityName(param1, param2);

// Pattern 2: [Description]
const example2 = utilityName({ option: value });
```

## 📝 API Reference

### Function Signature
```typescript
function utilityName(
  param1: Type1,
  param2?: Type2,
  options?: OptionsType
): ReturnType
```

### Parameters
- `param1` - [Description, required/optional, valid values]
- `param2` - [Description, default value if any]
- `options` - [Description of options object]

### Return Value
[What it returns and in what format]

## 🧪 Examples

### Example 1: [Common Use Case]
```typescript
// Input
const input = [example input];
const result = utilityName(input);

// Output
console.log(result); // [expected output]
```

### Example 2: [Edge Case]
```typescript
// Handling [specific scenario]
const edgeCase = utilityName(specialInput, { flag: true });
// Returns: [what happens]
```

## ⚠️ Edge Cases & Gotchas

- **[Edge case]**: [How it's handled or warning]
- **[Common mistake]**: [What happens and how to avoid]
- **[Performance note]**: [If applicable]

## 🔧 Implementation Notes

### Why It Works This Way
[Brief explanation of design decisions, e.g., "Uses UTC internally because..."]

### Dependencies
- [Any external libraries used]
- [Other utilities it depends on]

### Performance
- Time complexity: O(?)
- Space complexity: O(?)
- [Any caching or optimization notes]

## 🧹 Maintenance

### To Modify Safely
1. [What to check before changing]
2. [Tests to run]
3. [Common places that might break]

### Test Command
```bash
npm run test -- [test file path or pattern]
```

## 🐛 Common Issues

**Issue**: [Error message or symptom]
**Cause**: [Why it happens]
**Fix**: [How to resolve]

---

**See Also**: 
- [Related utility](/docs/utilities/related.md)
- [Feature that uses this](/docs/features/feature.md)