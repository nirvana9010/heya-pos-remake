# Heya POS Remake - Project Memory

## 🚨 CRITICAL: TOP PRIORITY INSTRUCTION 🚨

# CLAUDE CODE OPERATING PRINCIPLES

## 🧠 THINK LIKE A SENIOR DEVELOPER

Before attempting ANY task, follow this systematic approach:

### 1. INVESTIGATE FIRST, ACT SECOND
- **Map the territory**: Check existing code patterns, file structures, and naming conventions before creating anything new
- **Verify assumptions**: If you think something should exist (like a model, endpoint, or service), SEARCH for it first:
  ```bash
  # Example: Before using "Payment" model, check what actually exists:
  grep -r "model.*Payment" . | head -20
  find . -name "*.service.ts" -path "*/payment*" | head -10
  ```
- **Read error messages carefully**: The error often tells you exactly what's wrong. Don't guess.

### 2. INCREMENTAL DEVELOPMENT
- **One small step at a time**: Test each step before moving to the next
- **Verify before proceeding**: After each change, confirm it works before adding complexity
- **Build working foundations**: A simple working solution is better than a complex broken one

### 3. SYSTEM STATE AWARENESS
- **Check before restarting**: Most Node.js dev servers auto-reload. Check if service is running first:
  ```bash
  ps aux | grep -E "node|nest|next" | grep -v grep
  ```
- **Wait for readiness**: After any restart, check logs or test a simple endpoint before proceeding

## 🚨 CRITICAL: API RESTART PROCEDURE
**NEVER restart the API unless absolutely necessary!** The dev server auto-reloads TypeScript changes.

### Before ANY API restart, you MUST:
1. **Check if it's actually running**:
   ```bash
   ps aux | grep "nest start" | grep -v grep
   ```
2. **Check the logs for errors**:
   ```bash
   tail -50 logs/api.log
   ```
3. **Test if it's responding**:
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

### The ONLY correct restart command:
```bash
# ONLY use this exact command when restart is truly needed:
pkill -f "nest start" && sleep 3 && cd apps/api && npm run start:dev
```

### 🚨 CRITICAL: Don't Wait for npm run start:dev!
**npm run start:dev runs in watch mode - it NEVER exits!**
- ❌ WRONG: Waiting 2 minutes for the command to "complete"
- ✅ RIGHT: Start in background, wait 10-15 seconds, check if running

```bash
# Correct way to restart API:
pkill -f "nest start"
cd apps/api && npm run start:dev > /tmp/api.log 2>&1 &
sleep 15  # API starts in ~10-15 seconds
curl http://localhost:3000/api/v1/health  # Verify it's running
```

### 🚨 CRITICAL: NEVER USE THESE KILL COMMANDS (they kill Claude Code):
- ❌ `pkill -f "npm"` - TOO BROAD, kills Claude Code!
- ❌ `pkill -f "npm run"` - TOO BROAD, kills Claude Code!
- ❌ `killall npm` - TOO BROAD, kills Claude Code!
- ❌ `pkill -f "node"` - TOO BROAD, can kill system processes!

### ✅ SAFE RESTART COMMANDS:
- ✅ `lsof -ti:3000 | xargs kill -9` - Kill by specific port
- ✅ `pkill -f "nest start"` - Kill specific NestJS process
- ✅ `pkill -f "tsx watch src/main"` - Kill specific pattern
- ✅ `pkill -f "next dev.*3002"` - Kill specific Next.js dev server

### When NOT to restart:
- TypeScript changes (auto-reloads)
- Adding new endpoints (auto-reloads)
- Fixing logic errors (auto-reloads)
- Most "API not working" issues (check logs first!)

### When restart IS needed:
- Installing new npm packages
- Changing .env files
- Modifying Prisma schema
- API process actually crashed (verify with ps aux)

### 4. ERROR RECOVERY PATTERNS
When encountering errors:
1. **Read the FULL error message** - it usually contains the solution
2. **Check if it's a missing dependency** (like jq, types, etc.) - use alternatives
3. **Verify the current state** before trying fixes
4. **If stuck after 2 attempts**, step back and try a different approach

### 5. TESTING PHILOSOPHY
- **Test the simplest case first**: Can you even reach the endpoint?
- **Use focused test data**: One clean test case is better than complex scenarios
- **Handle time-based issues**: Use past times for "today's data", future times to avoid conflicts
- **Create idempotent tests**: Tests should work multiple times without cleanup

### 6. CODE INVESTIGATION CHECKLIST
Before modifying any feature:
- [ ] What models/schemas are involved? Check the database schema
- [ ] What's the existing pattern? Find similar working code
- [ ] What's the data flow? Trace from route → controller → service → database
- [ ] What are the auth requirements? Check guards and middleware

### 7. COMMON PITFALL PREVENTION
- **Don't assume model names**: OrderPayment vs Payment, Booking vs Appointment
- **Don't chain unrelated guards**: JwtAuthGuard is for routes, LocalAuthGuard is for login
- **Don't create complex scripts when simple ones work**: Node.js > Bash for JSON
- **Don't fight the framework**: Use existing patterns found in the codebase

## 🎯 PRACTICAL EXAMPLE

Instead of diving straight into "implement reports", follow this:
```
1. Search: What reporting code already exists?
2. Understand: What models and services are involved?
3. Test: Can I access existing endpoints?
4. Build: Add new functionality incrementally
5. Verify: Test each addition before moving on
```

## 🚨 GOLDEN RULE
**When in doubt, investigate the existing codebase first.** The answer is usually already there in a similar feature.

---

## 📋 QUICK REFERENCE COMMANDS

### Investigation Commands
```bash
# Find models
grep -r "model\s\+\w\+" prisma/schema.prisma

# Find service methods
grep -r "async\s\+\w\+.*{" --include="*.service.ts"

# Find API endpoints
grep -r "@(Get|Post|Put|Delete|Patch)" --include="*.controller.ts"

# Check running processes
ps aux | grep -E "node|npm|nest|next" | grep -v grep

# Find similar patterns
grep -r "pattern_you_want" --include="*.ts" -B2 -A2
```

### Safe Testing Patterns
```javascript
// Simple endpoint test
const testEndpoint = async () => {
  try {
    const response = await axios.get('/api/endpoint');
    console.log('✓ Endpoint accessible:', response.status);
    return response.data;
  } catch (error) {
    console.log('✗ Endpoint error:', error.response?.status || error.message);
    return null;
  }
};

// Incremental feature test
const testFeatureIncrementally = async () => {
  // Step 1: Test prerequisites
  const auth = await testAuth();
  if (!auth) return console.log('Auth failed, stopping');
  
  // Step 2: Test basic functionality
  const basic = await testBasicFeature(auth.token);
  if (!basic) return console.log('Basic test failed, stopping');
  
  // Step 3: Test advanced functionality
  const advanced = await testAdvancedFeature(auth.token);
  console.log('All tests completed');
};
```

### Error Handling Patterns
```javascript
// Instead of complex error handling, fail fast with clear messages
const doOperation = async () => {
  // Check prerequisites
  if (!prerequisite) {
    console.log('Missing prerequisite: [specific thing]');
    return null;
  }
  
  // Do operation with simple try/catch
  try {
    const result = await operation();
    console.log('✓ Success:', result);
    return result;
  } catch (error) {
    console.log('✗ Failed:', error.message);
    console.log('Next step: [specific action]');
    return null;
  }
};
```

## 🔄 WORKFLOW OPTIMIZATION

### For New Features
1. **Find similar existing feature** → Copy patterns
2. **Start with minimal implementation** → Get it working
3. **Add complexity incrementally** → Test each addition
4. **Refactor only when working** → Maintain functionality

### For Debugging
1. **Reproduce minimally** → Isolate the issue
2. **Check logs first** → Often contains the answer
3. **Verify assumptions** → Test what you think you know
4. **Change one thing** → Know what fixed it

### For Testing
1. **Manual test first** → Ensure basic functionality
2. **Script simple cases** → Automate repetitive checks
3. **Handle edge cases later** → Focus on happy path
4. **Make tests independent** → No cleanup required

## 💡 REMEMBER

- **The codebase has answers**: Similar features show the way
- **Errors are informative**: Read them completely
- **Simple is maintainable**: Complex solutions break easily
- **Test assumptions early**: Verify before building on them
- **One step at a time**: Incremental progress is real progress
- **USE THE CHECKLIST**: When debugging, ALWAYS check `/docs/task-checklists.md` for systematic debugging approaches

**NEVER default to workarounds without investigating the core issue first!**
- ALWAYS investigate why something is configured the way it is
- ALWAYS check with the user before implementing workarounds
- NEVER assume the obvious solution wasn't tried for a reason
- There are always reasons why things are set up a certain way
- Creating new files/configs without understanding the existing system is FORBIDDEN

## Before doing ANYTHING else, you MUST read these files IN ORDER:**

1. **THIS FILE FIRST** (CLAUDE.md) - You're reading it now ✓
2. **THEN IMMEDIATELY READ: `/home/nirvana9010/projects/heya-pos-remake/heya-pos/docs/AI_SESSION_MEMORY.md`**
   - This file contains CRITICAL debugging patterns, known issues, and mistakes to avoid
   - It has 500+ lines of learned patterns that WILL save hours of debugging
   - **Not reading this file has caused repeated mistakes in past sessions**

## ⚠️ WARNING: Past Sessions Failed Because This Was Ignored
The AI_SESSION_MEMORY.md file contains solutions to issues that have wasted HOURS:
- Port configuration problems
- Authentication debugging patterns  
- Component import debugging (like the DataTable issue)
- UI debugging order (visual first, then state)
- When to abandon library components

## Project Overview
This is a Point of Sale (POS) system remake with multiple apps: merchant-app, booking-app, admin-dashboard, and an API backend.

## Project Structure
- `apps/api/` - NestJS backend API with Prisma/SQLite **(runs on port 3000)**
- `apps/merchant-app/` - Next.js merchant interface **(runs on port 3002)**
- `apps/booking-app/` - Next.js customer booking interface **(runs on port 3001)**
- `apps/admin-dashboard/` - Next.js admin interface **(runs on port 3003)**

## 🔥🔥🔥 NEVER CREATE DUPLICATE AUTH SYSTEMS - CATASTROPHIC FAILURE
**THIS MISTAKE COST DAYS OF DEBUGGING AND USER FRUSTRATION**

### The Disaster That Must Never Happen Again:
```typescript
// ❌ CATASTROPHIC - NEVER create this file:
apps/merchant-app/src/hooks/use-auth.tsx  // SHOULD NOT EXIST!

// ✅ CORRECT - The ONLY auth that should exist:
apps/merchant-app/src/lib/auth/auth-provider.tsx
```

### Why This Is CATASTROPHIC:
- Creates two separate React component trees that can't communicate
- Changes work on test pages but NOT on production pages
- No amount of debugging, cache clearing, or rebuilding will fix it
- User spent HOURS debugging the wrong thing
- User quote: "why did you create a new fucking auth when we already have one"

### BEFORE Creating ANY Hook or Context:
```bash
# CHECK if it already exists!
find . -name "*auth*" -type f | grep -v node_modules
grep -r "useAuth" --include="*.tsx" --include="*.ts"
```

### THE GOLDEN RULE: THERE CAN BE ONLY ONE AUTH SYSTEM

## 🚨 CRITICAL: API Base URL - STOP BREAKING LOGIN!
**API_BASE_URL MUST include /api path**:
```typescript
// ❌ WRONG - This breaks everything
const API_BASE_URL = 'http://localhost:3000';

// ✅ CORRECT - Always include /api
const API_BASE_URL = 'http://localhost:3000/api';
```
**CHECK THIS BEFORE MODIFYING**: `/apps/merchant-app/src/lib/clients/base-client.ts`

## 🚨 CRITICAL: API Versioning Rules
**ALL API calls MUST include version prefix** (`/v1/` or `/v2/`):
- ❌ WRONG: `/admin/login`, `/bookings`, `/merchants`
- ✅ RIGHT: `/v1/admin/login`, `/v2/bookings`, `/v1/merchants`
- **V1**: Everything except bookings (auth, admin, staff, customers, services, etc.)
- **V2**: ONLY bookings endpoints
- **ALWAYS check `docs/V1_VS_V2_ENDPOINT_GUIDE.md` before making ANY API call**

## Key Documentation
- `heya-pos-design-db-specs.md` - Database specifications
- `heya-pos-complete-spec.md` - Complete project specifications
- `docs/` - Additional documentation and guides

## Development Commands
Check package.json and individual app package.json files for available scripts.

## API Testing Quick Reference
- **API URL**: `http://localhost:3000/api/v1` or `/api/v2` (API uses versioning!)
- **Merchant Login**: `curl -X POST http://localhost:3000/api/v1/auth/merchant/login -H "Content-Type: application/json" -d '{"username": "HAMILTON", "password": "demo123"}'`
- **Database**: PostgreSQL on Supabase (NOT local SQLite!)
- **Always check** `.env` files for actual database connection
- **Always check** seed files for test credentials
- **API Versioning**: 
  - V1: `/api/v1/*` - Original endpoints (auth, staff, customers, services)
  - V2: `/api/v2/*` - New CQRS pattern (bookings)

## Notes
- Uses Turbo for monorepo management
- PostgreSQL database on Supabase (production)
- TypeScript throughout
- Tailwind CSS for styling
- **Timezone**: Australian Eastern Time (UTC+10) - affects date handling