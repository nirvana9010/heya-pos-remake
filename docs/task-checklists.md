# CLAUDE CODE MANDATORY TASK CHECKLISTS

## 🔥🔥🔥 CATASTROPHIC: DUPLICATE AUTH SYSTEM CHECK - DO THIS FIRST WHEN DEBUGGING

### ⚠️ SYMPTOMS: Changes Not Appearing Despite Successful Compilation
If you experience ANY of these symptoms, CHECK FOR DUPLICATE AUTH IMMEDIATELY:
- ✅ Changes work on test pages
- ❌ Same changes don't appear on production pages  
- ✅ Code compiles successfully
- ❌ Browser shows old version
- ✅ Console logs work in test environment
- ❌ Console logs missing in production

### IMMEDIATE DEBUGGING CHECKLIST:
```bash
# 1. CHECK FOR DUPLICATE AUTH SYSTEMS - DO THIS FIRST!
echo "=== Checking for duplicate auth systems ==="
find . -name "*auth*" -path "*/hooks/*" | grep -v node_modules
find . -name "use-auth*" -type f | grep -v node_modules

# 2. Verify ONLY ONE auth exists (should be in lib/auth)
echo "=== The ONLY auth file that should exist ==="
ls -la apps/merchant-app/src/lib/auth/auth-provider.tsx

# 3. Check imports in the problem component
echo "=== Checking imports in BookingSlideOut ==="
grep -n "useAuth" apps/merchant-app/src/components/BookingSlideOut.tsx

# 4. If duplicate found, DELETE IT IMMEDIATELY
# rm -f apps/merchant-app/src/hooks/use-auth.tsx  # DELETE if exists!
```

### THE GOLDEN RULE:
**THERE CAN BE ONLY ONE AUTH SYSTEM**
- Location: `/apps/merchant-app/src/lib/auth/auth-provider.tsx`
- NEVER create auth in `/hooks` directory
- NEVER create duplicate auth "for testing"
- If component needs auth, import from the ONE TRUE AUTH

### Why This Is CATASTROPHIC:
- Creates separate React component trees
- Test pages and production pages can't communicate
- No amount of cache clearing will fix it
- User will waste HOURS debugging the wrong thing

### User Quote from The Incident:
> "why did you create a new fucking auth when we already have one"

This single mistake caused an entire day of wasted debugging.

## 🔥 CRITICAL: BEFORE MODIFYING ANY API CLIENT

### ⚠️ API Base URL Check (PREVENTS BREAKING LOGIN)
**File**: `/apps/merchant-app/src/lib/clients/base-client.ts`

```typescript
// ALWAYS verify this line FIRST:
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
//                                                                            ^^^^
//                                                         MUST include /api path!
```

### Test BEFORE Making Changes:
```bash
# 1. Test current login works
curl -X POST http://localhost:3000/api/v1/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"username":"HAMILTON","password":"demo123"}'

# 2. If returns 200 with token, DO NOT change API_BASE_URL
# 3. If returns 404, check if /api is missing
```

### Common Mistakes That Break Everything:
- ❌ Removing `/api` from base URL
- ❌ Adding version to base URL (like `/api/v1`)
- ❌ Changing URL structure without testing
- ❌ Assuming backend paths don't need `/api` prefix

## 🚀 SERVICE MANAGEMENT: Starting/Restarting Services

### API Service (Port 3000)
**CRITICAL**: `npm run start:dev` runs in watch mode - it NEVER exits!

#### ❌ WRONG Way (Wastes 2 minutes):
```bash
cd apps/api && npm run start:dev  # Will timeout waiting for exit
```

#### ✅ CORRECT Way:
```bash
# 1. Kill existing process (if any)
pkill -f "nest start" || true

# 2. Start in background with logs
cd apps/api && npm run start:dev > /tmp/api.log 2>&1 &

# 3. Wait for startup (NOT 2 minutes!)
sleep 15

# 4. Verify it's running
curl http://localhost:3000/api/v1/health
```

### Merchant App (Port 3002)
```bash
pkill -f "next dev.*3002" || true
cd apps/merchant-app && npm run dev > /tmp/merchant.log 2>&1 &
sleep 10
curl http://localhost:3002
```

### When to Restart Services:
- ✅ After installing new npm packages
- ✅ After changing .env files
- ✅ After modifying Prisma schema
- ❌ NOT for TypeScript changes (auto-reloads)
- ❌ NOT for adding endpoints (auto-reloads)

### Check What's Running:
```bash
# See all Node.js processes
ps aux | grep -E "node|nest|next" | grep -v grep

# Check specific ports
lsof -i :3000  # API
lsof -i :3002  # Merchant app
```

## 🚨 QUICK FIX: Common Prisma Database Errors

### "Column does not exist" Error
```bash
# This means schema.prisma and database are out of sync
cd apps/api
npx prisma db push  # Quick fix for development
# OR
npx prisma migrate dev --name fix_missing_columns  # Proper fix with migration
```

### "Table does not exist" Error
```bash
# Database is missing tables entirely
cd apps/api
npx prisma migrate deploy  # Apply all migrations
# OR if corrupted:
npx prisma migrate reset  # ⚠️ DELETES ALL DATA
```

### After ANY schema.prisma change:
1. `npx prisma generate` - Update TypeScript types
2. `npx prisma migrate dev --name what_changed` - Update database
3. Restart API if needed

## 🚨 MANDATORY FIRST STEP FOR EVERY TASK

Before doing ANYTHING else:

1. **READ** the task/request carefully
2. **IDENTIFY** which checklist(s) apply:
   - New Feature → NEW FEATURE CHECKLIST
   - Something broken → DEBUGGING/FIXING CHECKLIST  
   - Test something → TESTING CHECKLIST
   - Improve code → REFACTORING CHECKLIST
   - Import data → DATA MIGRATION/IMPORT CHECKLIST
   - Connect to API → API INTEGRATION CHECKLIST
   - Slow performance → PERFORMANCE ISSUE CHECKLIST
   - Multiple issues → EMERGENCY CHECKLIST

3. **CONFIRM** your approach:
   ```
   "I'll use the [CHECKLIST NAME] for this task. 
   The first phase is [PHASE 1 NAME] where I'll [brief description]."
   ```

4. **WAIT** for confirmation before proceeding

5. **FOLLOW** the checklist item by item, checking off each step

### For Complex Tasks Requiring Multiple Checklists:

If a task requires multiple checklists, state the order:
```
"This task requires multiple checklists:
1. First: DEBUGGING CHECKLIST to understand the current issue
2. Then: NEW FEATURE CHECKLIST to implement the solution
3. Finally: TESTING CHECKLIST to verify everything works

Starting with the DEBUGGING CHECKLIST, Phase 1: Understand the Problem..."
```

**IMPORTANT**: You MUST complete each checklist item IN ORDER before proceeding. Check off each item as you complete it.

### Example Response:
```
User: "The booking calendar isn't showing staff availability correctly"

Claude Code: "I'll use the DEBUGGING/FIXING CHECKLIST for this task.
The first phase is 'Understand the Problem' where I'll read error messages, 
check running services, and investigate the issue systematically.

Before making ANY changes, I'll:
1. Find all code that depends on staff availability
2. Test current booking functionality to establish baseline
3. Make minimal changes and test after each one

Phase 1 checklist:
- Read the complete error message
- Identify error type  
- Check if services are running
- Note exact file and line number

Shall I proceed?"
```

## 🚨 CRITICAL SAFETY RULES

### Before EVERY Code Change:
1. **FIND DEPENDENCIES**: `grep -r "WhatYoureChanging" --include="*.ts" --include="*.tsx"`
2. **TEST BEFORE**: Verify current functionality works
3. **CHANGE SMALL**: One file, one method at a time
4. **TEST AFTER**: Re-run the same test from step 2
5. **CHECK WIDELY**: If changing shared code, test 3+ features that use it

### RED FLAGS - STOP and RECONSIDER:
- About to change a model/schema used by multiple services
- Modifying a base class or shared utility
- Changing authentication/authorization logic
- Altering API response structures
- Updating database queries in shared services
- Modifying anything with 10+ imports

### When You See These Patterns:
```typescript
// If you see this in a file:
export class BaseService { }  // STOP - this affects ALL services
export interface User { }     // STOP - changing this breaks everywhere
export const sharedUtil = {}  // STOP - used across the codebase

// Instead, consider:
- Extending rather than modifying
- Creating new methods rather than changing existing
- Adding optional parameters rather than changing signatures
```

## 🛡️ SAFE MODIFICATION PATTERNS

### Instead of Breaking Changes:

```typescript
// ❌ BAD: Changing existing method signature
async findUser(email: string) → async findUser(email: string, includeDeleted: boolean)

// ✅ GOOD: Add optional parameter
async findUser(email: string, includeDeleted?: boolean)

// ❌ BAD: Modifying shared interface
interface User {
  name: string;  // Changing to firstName, lastName
}

// ✅ GOOD: Extend interface
interface UserV2 extends User {
  firstName: string;
  lastName: string;
}

// ❌ BAD: Changing API response
return { user: userData } → return { data: userData }

// ✅ GOOD: Support both during transition
return { 
  user: userData,  // Keep for backward compatibility
  data: userData   // New format
}
```

### Before ANY Model/Schema Change:
1. Count usages: `grep -r "ModelName" --include="*.ts" | wc -l`
2. If > 5 usages, create new version instead
3. Run ALL tests, not just related ones
4. Check API responses still match frontend expectations

---

### If Unsure Which Checklist:

If the task doesn't clearly fit one checklist:
1. **ASK**: "This task could use [Checklist A] or [Checklist B]. Which would you prefer?"
2. **DEFAULT**: When truly ambiguous, start with DEBUGGING CHECKLIST to understand current state
3. **COMBINE**: State if multiple checklists are needed and in what order

---

## 📋 NEW FEATURE CHECKLIST

When asked to implement a new feature:

```markdown
### PHASE 1: INVESTIGATION (No coding yet!)
- [ ] Search for similar existing features: `grep -r "similar_feature" --include="*.ts"`
- [ ] Identify the pattern used: Controller → Service → Repository/Database
- [ ] Find the database models involved: `grep "model ModelName" prisma/schema.prisma`
- [ ] Check existing API endpoints: `grep -r "@Get\|@Post" --include="*.controller.ts" | grep -i feature`
- [ ] Note authentication method used: Look for `@UseGuards()` decorators

### PHASE 2: PLANNING
- [ ] Write out the data flow: Request → Auth → Validation → Business Logic → Response
- [ ] List all files you'll need to create/modify
- [ ] Identify potential conflicts or dependencies

### PHASE 3: IMPLEMENTATION
- [ ] Before ANY change, identify what depends on this code: `grep -r "ClassName\|methodName" --include="*.ts"`
- [ ] Create/modify database schema if needed
- [ ] **Run `npx prisma generate` after schema changes**
- [ ] **Run `npx prisma migrate dev --name descriptive_name` to sync database**
- [ ] **Verify migration succeeded before proceeding**
- [ ] Check for breaking changes: Will existing queries still work?
- [ ] Implement service method with minimal logic
- [ ] Add controller endpoint WITHOUT modifying existing ones
- [ ] Test NEW functionality works: `curl http://localhost:3000/api/endpoint`
- [ ] Test EXISTING functionality still works (run existing test or manual check)
- [ ] Add validation/error handling
- [ ] Add complete business logic
- [ ] Test edge cases
- [ ] Run one more test of existing functionality to ensure nothing broke

### PHASE 4: VERIFICATION
- [ ] Test happy path
- [ ] Test error cases
- [ ] Check logs for warnings: `tail -50 logs/api.log | grep -i "warn\|error"`
- [ ] Ensure no existing functionality broken
```

## 🔍 DEBUGGING/FIXING CHECKLIST

When something isn't working:

```markdown
### ⚠️ STOP! BEFORE YOU WRITE ANY CODE:
1. **Open Browser DevTools → Network Tab**
2. **Reproduce the error**
3. **Look at the actual request payload**
4. **This takes 30 seconds and solves 50% of issues**

### PHASE 1: UNDERSTAND THE PROBLEM
- [ ] Read the COMPLETE error message (not just the first line)
- [ ] **LOG THE ACTUAL VALUES** - Error messages can be misleading!
  - [ ] If error says "must be X", log what's actually being passed
  - [ ] Example: "status: must be one of..." but status contained a UUID
  - [ ] Toast messages often reveal the real value: "Booking marked as [UUID]"
- [ ] Identify error type: Compilation? Runtime? Logic? Network?
- [ ] **CHECK BROWSER DEVTOOLS NETWORK TAB FIRST!** 
  - [ ] Look at the actual URL being called
  - [ ] Check request headers and payload
  - [ ] **VERIFY PAYLOAD DATA TYPES** - Is each field the right type?
    - [ ] Strings where strings expected (not UUIDs/IDs)
    - [ ] Numbers where numbers expected (not strings)
    - [ ] If validation error says "must be X", CHECK WHAT'S ACTUALLY BEING SENT
    - [ ] Example: API expects `{status: "confirmed"}` but might be sending `{status: "5ab3f904-67ce-443e"}`
  - [ ] Note the exact error response
  - [ ] This would have shown "/v1/auth/merchant/login" missing "/api" immediately!
  - [ ] **DO THIS BEFORE WRITING ANY CODE - IT TAKES 30 SECONDS**
- [ ] Check if services are running: `ps aux | grep -E "node|nest|next" | grep -v grep`
- [ ] Note the exact file and line number if provided
- [ ] **VERIFY WHICH COMPONENT IS ACTUALLY BEING USED**
  - [ ] Check dynamic imports: `import('@/components/...')`
  - [ ] Don't fix files that aren't being loaded!

### PHASE 2: INVESTIGATE
- [ ] Check recent changes: `git status` and `git diff`
- [ ] **CHECK PARAMETER SIGNATURES MATCH**
  - [ ] Compare how caller invokes vs how handler expects params
  - [ ] Example bug: `onClick={() => handler(id, status)}` vs `const handler = (status) => {}`
  - [ ] Parameters can get swapped if signatures don't match!
- [ ] **COMPARE WORKING VS BROKEN AT THE SAME LAYER**
  - [ ] UI handlers should be compared to UI handlers
  - [ ] Don't compare API calls to UI events
  - [ ] Working feature might be masking the same bug
- [ ] **If database error: Check if schema and database are in sync**
  - [ ] Compare schema.prisma with actual database
  - [ ] Run `npx prisma migrate status` to check migration state
  - [ ] If "column does not exist": Run `npx prisma db push` or create migration
- [ ] **If React "Maximum update depth exceeded" error:**
  - [ ] Check PARENT component for unstable props (inline functions, new objects)
  - [ ] Look for `() => {}` callbacks, `.map()` calls, `new Date()` in props
  - [ ] Verify all callbacks are wrapped in `useCallback`
  - [ ] Ensure all derived arrays/objects use `useMemo`
  - [ ] Remember: Error location is often the victim, not the culprit!
- [ ] Look for similar working code: How does it handle this?
- [ ] Find all code that calls the broken functionality: `grep -r "methodName\|endpoint" --include="*.ts"`
- [ ] Test a WORKING feature first to establish baseline
- [ ] Verify assumptions: "Does this model/endpoint/service actually exist?"
- [ ] Check logs for additional context: `tail -100 logs/api.log`
- [ ] Document what currently works vs what's broken

### PHASE 3: MINIMAL FIX
- [ ] Identify ALL places that use the code you're about to change
- [ ] Fix ONLY the immediate issue (no refactoring yet)
- [ ] Test the specific failing case
- [ ] Test at least 2 other features that use the same code
- [ ] Check for TypeScript errors: `npm run type-check` or `tsc --noEmit`
- [ ] Verify fix doesn't break other things
- [ ] If fix affects shared code (models, utils), test EVERYTHING that imports it
- [ ] If still broken after 2 attempts, try different approach

### PHASE 4: VERIFY & CLEANUP
- [ ] Run the original failing operation
- [ ] Test related functionality
- [ ] Clean up any debug code
- [ ] Document the fix if non-obvious

### 🚨 PROCESS MANAGEMENT (AVOID 2-HOUR DEBUGGING SESSIONS)
- [ ] **CHECK WHAT'S ACTUALLY RUNNING FIRST**:
  ```bash
  ps aux | grep -E "node|next|nest" | grep -v grep
  ```
- [ ] **IDENTIFY SPECIFIC PROCESSES BY PORT**:
  ```bash
  lsof -ti:3000  # API
  lsof -ti:3002  # Merchant app
  ```
- [ ] **CLEAN RESTART PROCEDURE**:
  1. Kill ONLY the specific process (NOT all npm/node):
     ```bash
     # ✅ SAFE: Kill by specific port
     lsof -ti:3002 | xargs kill -9
     # ✅ SAFE: Kill specific process pattern
     pkill -f "next dev.*3002"
     # ❌ DANGEROUS: Kills Claude Code!
     pkill -f "npm"  # NEVER USE THIS!
     ```
  2. Wait for port to clear:
     ```bash
     sleep 3
     ```
  3. Start cleanly from correct directory:
     ```bash
     cd apps/merchant-app && npm run dev
     ```
- [ ] **WHEN MULTIPLE PROCESSES CONFLICT**:
  - Check logs to see restart loops ("address already in use")
  - Kill ALL instances of that specific app
  - Don't try to restart while another is still starting

### 🔧 ENVIRONMENT VARIABLE DEBUGGING
- [ ] **CHECK .env FILES BEFORE CHANGING CODE**:
  ```bash
  # Check all env files in the app
  ls -la apps/merchant-app/.env*
  cat apps/merchant-app/.env.local | grep API_URL
  ```
- [ ] **COMMON ENV VARIABLE MISTAKES**:
  - Missing `/api` in API URL: `NEXT_PUBLIC_API_URL=http://localhost:3000` ❌
  - Correct format: `NEXT_PUBLIC_API_URL=http://localhost:3000/api` ✅
- [ ] **VERIFY ENV VARIABLES ARE LOADED**:
  - Next.js shows loaded env files on startup
  - Check the startup logs: "Environments: .env.local, .env.development"
- [ ] **WHEN CODE LOOKS RIGHT BUT DOESN'T WORK**:
  1. Check if env variable overrides the code default
  2. Test with hardcoded value temporarily
  3. If that works, it's definitely an env issue
```

## 🧪 TESTING CHECKLIST

When asked to test functionality:

```markdown
### PHASE 1: SETUP
- [ ] Verify all services running: `npm run dev:status` or check processes
- [ ] Get fresh auth token if needed
- [ ] Identify test data requirements

### PHASE 2: INCREMENTAL TESTING
- [ ] Test authentication works
- [ ] Test simplest endpoint first (health check, basic GET)
- [ ] Test target functionality with minimal data
- [ ] Log each step's result clearly

### PHASE 3: COMPREHENSIVE TESTING
- [ ] Test happy path completely
- [ ] Test validation (missing fields, wrong types)
- [ ] Test edge cases (empty arrays, null values)
- [ ] Test error handling (wrong IDs, unauthorized)

### PHASE 4: CREATE REUSABLE TEST
- [ ] Write simple Node.js script (not complex bash)
- [ ] Include clear console output
- [ ] Make it idempotent (can run multiple times)
- [ ] Add to scripts/ directory
```

## 🔄 REFACTORING CHECKLIST

When improving existing code:

```markdown
### PHASE 1: ENSURE WORKING STATE
- [ ] Verify current functionality works
- [ ] Create simple test to verify behavior
- [ ] Commit current working state: `git add . && git commit -m "Before refactor"`

### PHASE 2: INCREMENTAL CHANGES
- [ ] Change one small thing
- [ ] Run test to verify still works
- [ ] Repeat for each change
- [ ] Never change multiple things at once

### PHASE 3: CLEANUP
- [ ] Remove old code
- [ ] Update related documentation
- [ ] Run full test suite
- [ ] Check for console warnings
```

## 📊 DATA MIGRATION/IMPORT CHECKLIST

When importing or migrating data:

```markdown
### PHASE 1: UNDERSTAND DATA
- [ ] Examine source data structure (first 5 rows)
- [ ] Identify target database schema
- [ ] Map fields from source to target
- [ ] Note required transformations

### PHASE 2: VALIDATION SCRIPT
- [ ] Create script that validates data WITHOUT importing
- [ ] Check for required fields
- [ ] Validate data types and formats
- [ ] Report issues clearly

### PHASE 3: IMPORT PROCESS
- [ ] Import 1 record first
- [ ] Verify in database
- [ ] Import 10 records
- [ ] Check for issues
- [ ] Import remaining data in batches
- [ ] Log progress and errors

### PHASE 4: VERIFICATION
- [ ] Count imported records
- [ ] Spot check random samples
- [ ] Test functionality with imported data
- [ ] Create rollback plan if needed
```

## 🔌 API INTEGRATION CHECKLIST

When integrating with external or internal APIs:

```markdown
### PHASE 1: API DISCOVERY
- [ ] **INVESTIGATE FIRST - DO NOT ASSUME ENDPOINTS!**
  - [ ] Search for ACTUAL endpoint usage in codebase: `grep -r "endpoint_name" --include="*.ts"`
  - [ ] Check API client files for exact paths
  - [ ] Verify endpoint in controller: `grep -r "@Get.*endpoint\|@Post.*endpoint" --include="*.controller.ts"`
  - [ ] Test the ACTUAL endpoint with curl before writing code
- [ ] Find API documentation or existing usage
- [ ] Identify authentication method
- [ ] Note base URL and endpoints needed
- [ ] Check for rate limits or restrictions

### PHASE 2: VERIFY BEFORE CODING
- [ ] **TEST THE EXACT ENDPOINT YOU FOUND**:
  ```bash
  # Example: Don't assume /services/categories, verify it's actually /service-categories
  curl -X GET http://localhost:3000/api/v1/[ACTUAL_ENDPOINT] -H "Authorization: Bearer [token]"
  ```
- [ ] Confirm response structure matches expectations
- [ ] Note any version prefix (v1, v2) requirements
- [ ] Check if endpoint requires specific headers

### PHASE 3: MINIMAL INTEGRATION
- [ ] Use the VERIFIED endpoint path from your investigation
- [ ] Create simple service method
- [ ] Handle basic errors (network, auth)
- [ ] Log requests and responses

### PHASE 4: ROBUST INTEGRATION
- [ ] Add proper error handling
- [ ] Implement retry logic if appropriate
- [ ] Add request/response typing
- [ ] Cache responses if applicable

### PHASE 5: TESTING
- [ ] Test success cases
- [ ] Test failure cases (wrong auth, 404, 500)
- [ ] Test timeout handling
- [ ] Verify no sensitive data in logs

### 🚨 COMMON ENDPOINT MISTAKES TO AVOID:
- ❌ Assuming plural when it's singular: `/services/categories` vs `/service-categories`
- ❌ Missing version prefix: `/categories` vs `/v1/categories`
- ❌ Wrong HTTP method: GET vs POST
- ❌ Missing required headers or auth tokens
- ✅ ALWAYS verify with actual API calls before coding!
```

## ⚡ PERFORMANCE ISSUE CHECKLIST

When addressing performance problems:

```markdown
### PHASE 1: MEASURE
- [ ] Identify specific slow operation
- [ ] Measure current performance (add timestamps)
- [ ] Check database queries being run
- [ ] Look for N+1 query problems

### PHASE 2: ANALYZE
- [ ] Profile the slow operation
- [ ] Identify bottlenecks (DB? Network? Logic?)
- [ ] Check for missing indexes
- [ ] Look for unnecessary data fetching

### PHASE 3: OPTIMIZE
- [ ] Fix most impactful issue first
- [ ] Measure improvement
- [ ] Only continue if still too slow
- [ ] Avoid premature optimization

### PHASE 4: VERIFY
- [ ] Ensure functionality unchanged
- [ ] Test with realistic data volume
- [ ] Check memory usage
- [ ] Document optimization made
```

## 🔄 PARAMETER MISMATCH CHECKLIST

When errors don't match reality (e.g., validation error but value seems correct):

```markdown
### SIGNS OF PARAMETER MISMATCH
- [ ] Error message doesn't match what you think you're sending
- [ ] Validation says "must be X" but you're sending X
- [ ] UUID or ID appears where string expected
- [ ] Number appears where boolean expected

### DEBUGGING STEPS
1. **LOG ACTUAL VALUES AT EVERY LAYER**
   ```typescript
   // In the component calling the handler
   console.log('Calling handler with:', param1, param2);
   onClick={() => handler(param1, param2)}
   
   // In the handler itself
   const handler = (receivedParam1, receivedParam2) => {
     console.log('Handler received:', receivedParam1, receivedParam2);
   }
   ```

2. **CHECK SIGNATURES MATCH**
   ```typescript
   // BAD: Mismatch in parameters
   // Caller: onStatusChange(bookingId, status)
   // Handler: const handleStatusChange = (status) => {}
   // Result: bookingId gets passed as status!
   
   // GOOD: Parameters match
   // Caller: onStatusChange(bookingId, status)
   // Handler: const handleStatusChange = (bookingId, status) => {}
   ```

3. **COMMON PATTERNS THAT CAUSE MISMATCHES**
   - Component passes 2 params, handler expects 1
   - Event handlers that ignore parameters (using closure values)
   - Spread operators passing entire objects
   - Array methods passing index as second parameter

### REAL EXAMPLE FROM CODEBASE
```typescript
// BookingActions called:
onStatusChange(booking.id, "in-progress")

// But BookingDetailsSlideOut had:
const handleStatusChange = async (newStatus: string) => {
  // booking.id was received as newStatus!
  await onStatusChange(booking.id, newStatus);
}

// Fix: Match the signature
const handleStatusChange = async (bookingId: string, newStatus: string) => {
  await onStatusChange(bookingId, newStatus);
}
```
```

## ⚛️ REACT INFINITE LOOP CHECKLIST

When encountering "Maximum update depth exceeded" or performance issues:

```markdown
### PHASE 1: IDENTIFY THE REAL CULPRIT
- [ ] Note which component the error appears in (this is often NOT the cause)
- [ ] Find the PARENT component that renders the erroring component
- [ ] Look for unstable prop references in the parent:
  - [ ] Inline arrow functions: `onClick={() => doSomething()}`
  - [ ] Inline object creation: `style={{ color: 'red' }}`
  - [ ] Array mapping in props: `items={data.map(item => ({...}))}`
  - [ ] Default parameters with objects: `function Component({ data = [] })`
  - [ ] `new Date()` anywhere in render or as default prop

### PHASE 2: STABILIZE REFERENCES
- [ ] Wrap all callback props with `useCallback`:
  ```typescript
  const handleClick = useCallback(() => {
    // handler logic
  }, [dependencies]);
  ```
- [ ] Memoize derived data with `useMemo`:
  ```typescript
  const processedData = useMemo(() => 
    data.map(item => ({ ...item, processed: true })),
    [data]
  );
  ```
- [ ] Move default values outside component or use `useState`:
  ```typescript
  // Bad: initialData = new Date()
  // Good: const [defaultDate] = useState(() => new Date());
  ```

### PHASE 3: VERIFY THE FIX
- [ ] Test the exact scenario that caused the error
- [ ] Check React DevTools Profiler for excessive renders
- [ ] Ensure no new performance issues introduced
- [ ] Test related functionality still works
```

## 🚨 EMERGENCY CHECKLIST

When everything is broken:

```markdown
### IMMEDIATE ACTIONS
- [ ] Stop making changes
- [ ] Check what's actually running: `ps aux | grep -E "node|nest|next"`
- [ ] Check recent git commits: `git log --oneline -10`
- [ ] Restart ONE service properly if needed

### RECOVERY
- [ ] Revert to last known working state if necessary
- [ ] Test basic functionality
- [ ] Proceed with debugging checklist
- [ ] Document what went wrong
```

## 🏃 QUICK DEBUGGING WINS (DO THESE FIRST!)

Before diving into complex debugging:

### 1. **BROWSER DEVTOOLS NETWORK TAB** (Solves 50% of API issues)
   - Open DevTools → Network tab
   - Try the failing operation
   - Look at the ACTUAL request URL (not what you think it is)
   - Check response status and body
   - **Example**: Would have shown `/v1/auth/merchant/login` instead of `/api/v1/auth/merchant/login` immediately

### 2. **CHECK WHAT'S ACTUALLY RUNNING**
   ```bash
   ps aux | grep -E "node|nest|next" | grep -v grep
   ```

### 3. **CHECK ENV VARIABLES**
   ```bash
   cat apps/merchant-app/.env.local | grep API
   ```

### 4. **CHECK RECENT CHANGES**
   ```bash
   git status && git diff
   ```

These 4 steps would have solved the 2-hour debugging session in 2 minutes!

## 📝 UNIVERSAL RULES

Apply these to EVERY task:

1. **CHECK DEPENDENCIES FIRST**: Before changing ANYTHING, find what uses it
2. **ONE CHANGE AT A TIME**: Never modify multiple things simultaneously
3. **TEST BEFORE AND AFTER**: Verify functionality before changing, test again after
4. **READ ERRORS COMPLETELY**: The solution is often in the error message
5. **USE EXISTING PATTERNS**: The codebase already shows the way
6. **SIMPLE BEFORE COMPLEX**: Get basic version working first
7. **LOG EVERYTHING**: Clear console output at each step
8. **FAIL FAST**: If stuck after 2 attempts, try different approach
9. **PRESERVE WORKING CODE**: Never break existing functionality for new features
10. **EXTEND, DON'T MODIFY**: Add new rather than change existing when possible

## 🎯 COMPLETION CRITERIA

Before considering ANY task complete:

- [ ] Feature/fix works as requested
- [ ] No new errors in logs
- [ ] Related functionality still works
- [ ] Code follows existing patterns
- [ ] Test script created if applicable
- [ ] Can be run multiple times successfully