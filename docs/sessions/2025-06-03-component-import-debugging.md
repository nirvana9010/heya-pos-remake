# Component Import Debugging - June 3, 2025

## Issue Encountered
Staff page was showing a stacktrace due to importing `DataTable` from `@heya-pos/ui`.

## Wrong Approach Taken
1. **Immediately assumed component didn't exist** without checking
2. **Implemented a workaround** by replacing DataTable with basic HTML table
3. **Lost functionality** like pagination and proper column handling
4. **Created inconsistency** with other pages using DataTable

## Root Cause Investigation (What I Should Have Done First)
1. Searched for `DataTable` in the codebase
2. Found it exists at `/packages/ui/src/components/data-table.tsx`
3. Verified it's properly exported in `/packages/ui/src/index.ts`
4. Discovered other pages (payments, admin dashboard) successfully use it

## Correct Solution
- Used the existing DataTable component with proper column definitions
- Maintained consistency across the application
- Preserved all DataTable features (pagination, sorting, etc.)

## Key Learnings

### Always Investigate Before Implementing Workarounds
- **Check if component exists** in the codebase first
- **Verify exports** in package index files
- **Look for usage examples** in other parts of the app
- **Understand the intended architecture** before making changes

### Cost of Workarounds
- Technical debt accumulation
- Loss of features
- Inconsistent user experience
- More work to fix later

### Debugging Import Issues Checklist
1. Check if the component file exists
2. Verify it's exported from the package index
3. Look for successful imports in other files
4. Check for build/compilation issues
5. Verify package.json dependencies

## Code Pattern for DataTable Usage

```typescript
// Correct column definition for DataTable
const columns = [
  {
    id: 'uniqueId',
    accessorKey: 'dataField',
    header: 'Column Header',
    cell: ({ row }: any) => {
      const item = row.original;
      return <div>{item.field}</div>;
    }
  }
];

// Usage
<DataTable
  columns={columns}
  data={filteredData}
  pageSize={10}
/>
```

## Related Files for Reference
- `/packages/ui/src/components/data-table.tsx` - Component implementation
- `/packages/ui/src/index.ts` - Package exports
- `/apps/merchant-app/src/app/payments/page.tsx` - Good example of DataTable usage
- `/apps/merchant-app/src/app/staff/page.tsx` - Fixed implementation