# 🧠 AI Session Memory - Heya POS Project

> **ALWAYS READ THIS FILE FIRST** before making any changes to the project.
> Last Updated: 2025-06-13 5:30 PM
> 
> **CRITICAL UPDATE**: Port management issues causing hours of debugging - SEE NEW SECTION BELOW
> **NEW**: Screenshots are stored in `/home/nirvana9010/projects/heya-pos-remake/screenshots/` folder
> **LATEST**: React Date rendering error pattern identified - SEE NEW SECTION

## 🚨 CRITICAL: Recurring Port/Service Management Problem

### The Problem That Keeps Happening
**Every time services restart, we waste hours debugging "Failed to fetch" errors.** This is NOT a random issue - it's a systemic problem with how we manage services.

### Root Causes Identified:
1. **Port Confusion**: API configured for port 3000 but various places expect 3001
2. **Build Cache Corruption**: Next.js `.next` cache corrupts when services crash
3. **Process Zombies**: Multiple `nest start` processes running simultaneously
4. **No Clean Shutdown**: Background processes (`&`) without proper tracking
5. **Missing Health Checks**: No way to quickly verify all services are running

### THE SOLUTION - USE THESE SCRIPTS ALWAYS:
```bash
npm run start       # Start all services properly
npm run stop        # Stop all services cleanly
npm run status      # Check what's running
npm run restart     # Full restart
npm run clean-start # Clean caches and start fresh
```

### Port Assignments (NEVER CHANGE):
- API: 3000
- Booking App: 3001
- Merchant App: 3002
- Admin Dashboard: 3003

### Common Error Fixes:
1. **"Failed to fetch"**: Run `npm run status` then `npm run restart`
2. **"Cannot find module './496.js'"**: Run `npm run clean-start`
3. **"EADDRINUSE"**: Run `npm run stop` then `npm run start`
4. **Multiple processes**: Run `npm run stop` then check with `npm run status`

### DO NOT DO THESE:
- ❌ Start services with `npm run dev` in individual directories
- ❌ Use random background processes with `&`
- ❌ Change port assignments
- ❌ Kill processes without using the stop script
- ❌ Debug for hours - use the scripts!

## ⚡ Quick Decision Tree

```
API won't start?
├─ Check status: `npm run status`
├─ Try restart: `npm run restart`
├─ Still failing? → Use clean start: `npm run clean-start`
└─ Still issues? → Debug systematically (see below)

Repeated error pattern?
├─ Same error 3+ times? → STOP
├─ Check this file for solution
├─ Fix the root cause, don't work around it
└─ If not here → Add it after fixing
```

## 🚨 CRITICAL: React Date Object Rendering Error

### The Error That Stumped Us
**"Objects are not valid as a React child (found: [object Date])"** - This error can waste HOURS because:
1. The stack trace line numbers don't match source files (transpiled code)
2. The error happens on page load, not user interaction
3. Standard debugging techniques fail to locate the issue

### Root Cause Discovered
The API transformation layer (`db-transforms.ts`) was automatically converting date strings to Date objects, which then got passed as props and eventually rendered as React children.

### The Solution Pattern
1. **DON'T auto-transform dates to Date objects in API responses**
   ```typescript
   // BAD - causes rendering errors
   transformed[key] = value ? transformDate(value) : value;
   
   // GOOD - keep as strings
   transformed[key] = value; // Let components handle conversion
   ```

2. **Convert to Date objects only where needed**
   ```typescript
   const startTime = booking.startTime instanceof Date 
     ? booking.startTime 
     : new Date(booking.startTime);
   ```

3. **Always format dates before rendering**
   ```typescript
   // Use safeFormat or format() from date-fns
   {format(booking.startTime, 'HH:mm')}
   ```

### Common Culprits

## 🗄️ Database Seeding Procedures

### Quick Booking Seed Script (Copy & Modify)
When you need to add bookings to the database, use this template:

```typescript
// Save as: apps/api/prisma/seed-bookings-quick.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedBookings() {
  // 1. GET MERCHANT (adjust name as needed)
  const merchant = await prisma.merchant.findFirst({
    where: { name: 'Hamilton Beauty Spa' } // Change merchant name here
  });
  if (!merchant) throw new Error('Merchant not found');

  // 2. GET REQUIRED DATA IN PARALLEL
  const [location, staff, services, customers] = await Promise.all([
    prisma.location.findFirst({ where: { merchantId: merchant.id }}),
    prisma.staff.findMany({ where: { merchantId: merchant.id }}),
    prisma.service.findMany({ where: { merchantId: merchant.id }}),
    prisma.customer.findMany({ where: { merchantId: merchant.id }, take: 50 })
  ]);

  // 3. QUICK BOOKING CREATION (adjust parameters as needed)
  const DAYS_PAST = 7;      // How many days of past bookings
  const DAYS_FUTURE = 7;    // How many days of future bookings
  const BOOKINGS_PER_DAY = 8; // Average bookings per day
  
  const now = new Date();
  const bookings = [];

  // Create bookings for date range
  for (let day = -DAYS_PAST; day <= DAYS_FUTURE; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    
    for (let i = 0; i < BOOKINGS_PER_DAY; i++) {
      const hour = 9 + Math.floor(Math.random() * 9); // 9am-5pm
      date.setHours(hour, Math.random() < 0.5 ? 0 : 30, 0, 0);
      
      const booking = {
        merchantId: merchant.id,
        locationId: location.id,
        customerId: customers[Math.floor(Math.random() * customers.length)].id,
        bookingNumber: `BK${Date.now()}${Math.random().toString(36).substring(2, 5)}`.toUpperCase(),
        status: day < 0 ? 'COMPLETED' : day === 0 ? 'CONFIRMED' : 'CONFIRMED',
        startTime: new Date(date),
        endTime: new Date(date.getTime() + 60 * 60000), // 60 min default
        totalAmount: 100, // Default price
        depositAmount: 20, // 20% deposit
        source: 'ONLINE',
        createdById: staff[0].id,
        providerId: staff[Math.floor(Math.random() * staff.length)].id,
        services: {
          create: {
            serviceId: services[Math.floor(Math.random() * services.length)].id,
            price: 100,
            duration: 60,
            staffId: staff[Math.floor(Math.random() * staff.length)].id,
          }
        }
      };
      
      bookings.push(booking);
    }
  }

  // Batch create for speed
  console.log(`Creating ${bookings.length} bookings...`);
  for (const booking of bookings) {
    await prisma.booking.create({ data: booking });
  }
  
  console.log('✅ Done!');
  await prisma.$disconnect();
}

seedBookings().catch(console.error);
```

### Running the Seed Script
```bash
# From project root
cd apps/api
npx ts-node prisma/seed-bookings-quick.ts

# Or if you get path errors
cd /home/nirvana9010/projects/heya-pos-remake/heya-pos/apps/api
npx ts-node prisma/seed-bookings-quick.ts
```

### Common Customizations

#### 1. Specific Date Range
```typescript
// Replace the date loop with:
const startDate = new Date('2025-06-01');
const endDate = new Date('2025-06-30');
for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  // Create bookings for date d
}
```

#### 2. Specific Time Patterns
```typescript
// Morning rush (8-10am)
const hour = 8 + Math.floor(Math.random() * 2);

// Lunch appointments (12-2pm)
const hour = 12 + Math.floor(Math.random() * 2);

// Evening appointments (5-7pm)
const hour = 17 + Math.floor(Math.random() * 2);
```

#### 3. Specific Service Types
```typescript
// Filter services first
const facialServices = services.filter(s => s.categoryName === 'Facials');
const massageServices = services.filter(s => s.categoryName === 'Massages');

// Use filtered list
serviceId: facialServices[Math.floor(Math.random() * facialServices.length)].id,
```

#### 4. Realistic Booking Patterns
```typescript
// Fewer bookings on Mondays
const dayOfWeek = date.getDay();
const bookingsToday = dayOfWeek === 1 ? 4 : BOOKINGS_PER_DAY;

// No bookings on Sundays
if (dayOfWeek === 0) continue;
```

#### 5. Testing Specific Statuses
```typescript
// Create various statuses for today
const statuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
status: day === 0 ? statuses[i % statuses.length] : 'CONFIRMED',
```

### Quick Commands for Common Scenarios

```bash
# Clear all bookings first (if needed)
npx prisma db execute --sql "DELETE FROM booking_services; DELETE FROM bookings;"

# Run main seed (creates merchant, staff, services, customers)
npx prisma db seed

# Add bookings only
npx ts-node prisma/seed-bookings-quick.ts

# Check booking count
curl -s http://localhost:3000/api/bookings -H "Authorization: Bearer $(cat ~/.heya-auth-token)" | jq '.meta.total'
```

### Troubleshooting

1. **"Merchant not found"**: Check merchant name in database or run main seed first
2. **Type errors with Decimal**: Use `Number(service.price)` for calculations
3. **Slow execution**: Reduce date range or use `Promise.all` for parallel creation
4. **Auth errors**: Login first with `curl -X POST http://localhost:3000/api/auth/merchant/login -H "Content-Type: application/json" -d '{"username": "HAMILTON", "password": "demo123"}' | jq -r '.token' > ~/.heya-auth-token`

### Common Culprits
- Tooltip/Popover components that spread props
- Array.map() that includes Date objects
- Console.log() statements with objects containing dates
- Spread operators ({...booking}) where booking has Date properties
- Third-party UI components that iterate over props

### Debugging Techniques That Actually Work
1. **Comment out console.logs** - They can cause the error in dev mode
2. **Check API transformations** - Look for automatic Date conversions
3. **Use error boundaries** - They'll catch and show where it happens
4. **Search for date field names**: startTime, endTime, createdAt, etc.
5. **Check all .map() calls** - Ensure no Date objects in rendered output

### Prevention
- Keep dates as ISO strings in API responses
- Only convert to Date objects for calculations
- Always format dates explicitly before rendering
- Use TypeScript to catch potential issues

### Fixing API Issues Properly

**Common API startup problems and their REAL fixes:**

1. **Port conflicts (EADDRINUSE)**
   ```bash
   npm run stop       # Clean shutdown
   npm run status     # Verify stopped
   npm run start      # Clean start
   ```

2. **Module resolution errors**
   ```bash
   # Build packages first - they're dependencies!
   npm run build:packages
   npm run clean-start
   ```

3. **Build cache corruption**
   ```bash
   # Nuclear option - full reset
   cd apps/api
   rm -rf dist node_modules .next
   npm install
   npm run build
   npm run start:dev
   ```

4. **Process zombies**
   ```bash
   npm run stop       # Uses proper process tracking
   ps aux | grep nest # Verify cleanup
   npm run start      # Fresh start
   ```

**Key principle**: The API MUST work. Don't bypass it - fix it.

## 🚨 Critical Rules - DO NOT VIOLATE

### -1. React Component Definition Location
- **NEVER** define components inside other components
- **WHY**: Components defined inside render functions are recreated on every parent render
- **SYMPTOM**: Form inputs lose focus on every keystroke
- **FIX**: Move component definitions outside the parent component
- **EXAMPLE**: CustomerForm inside BookingPage caused focus loss on every input change

### 0. Authentication Redirect NOT WORKING
- **STATUS**: UNSOLVED - There is NO automatic redirect to login when authentication fails
- **PROBLEM**: The API client interceptor attempts `window.location.href = '/login'` on 401 errors
- **REALITY**: This redirect is NOT working properly - users see errors instead of being redirected
- **IMPACT**: When tokens expire, users get stuck with error messages instead of login page
- **TODO**: This needs to be properly fixed - the redirect mechanism is broken

### 1. UI Debugging Order - ALWAYS START WITH VISUAL
- **FIRST**: Check if element exists in DOM (Inspect Element)
- **SECOND**: Check if element is visible (CSS: display, opacity, z-index, position)
- **THIRD**: Check if element is interactive (pointer-events, disabled)
- **LAST**: Debug state, props, API calls
- **WHY**: Visual issues have visual causes - don't debug backend when frontend doesn't render

### 2. Component Library Fallback Rule
- **RULE**: After 3 failed attempts to fix a library component, implement custom solution
- **APPLIES TO**: Modals, dropdowns, complex UI components with portals/z-index
- **CUSTOM APPROACH**: Use `fixed inset-0` positioning + basic HTML/CSS + proper UI components inside
- **WHY**: Library components can have invisible failures (portal conflicts, CSS-in-JS issues, build problems)

### 3. Authentication Guard Order
- **NEVER** make PermissionsGuard global
- **ALWAYS** use guards in this order: `@UseGuards(JwtAuthGuard, PermissionsGuard)`
- **WHY**: Global guards execute before controller guards, breaking authentication

### 2. Controller Paths
- **NEVER** include 'api' in controller paths
- **CORRECT**: `@Controller('customers')`
- **WRONG**: `@Controller('api/customers')`
- **WHY**: Main.ts already sets global prefix '/api'

### 3. Process Management
- **NEVER** use `pkill -f "node"` (kills the AI terminal)
- **USE**: Specific process names like `pkill -f "nest start"`
- **WHY**: Broad kill commands can terminate the development environment

### 4. API Build & Startup
- **ALWAYS** fix API issues properly - no workarounds
- **FIRST** check if API is already built: `ls apps/api/dist/`
- **PROBLEM**: NestJS build creates nested structure (dist/apps/api/src/main.js)
- **PROPER FIX**: Use the npm scripts that handle this complexity
- **WHY**: Workarounds create technical debt and hide real issues

### 5. Package Management
- **ALWAYS** build packages before API: `npm run build -w @heya-pos/types -w @heya-pos/utils`
- **NEVER** point package.json to .ts files in production
- **ENSURE** packages have proper exports in package.json
- **WHY**: TypeScript can't resolve .ts imports at runtime

## 📚 Knowledge Base

### Project Structure
```
/apps/api          # NestJS backend (port 3000)
/apps/merchant-app # Next.js merchant UI (port 3002)
/packages          # Shared packages
/docs              # All documentation
```

### Authentication Flow
1. Merchant logs in → JWT token generated
2. Token includes merchantId and type
3. JwtAuthGuard validates token and attaches user to request
4. PermissionsGuard checks permissions (merchants have '*')
5. PIN auth removed from UI flow

### Database
- Type: SQLite (`/apps/api/prisma/dev.db`)
- Test Merchants: 
  - Luxe Beauty & Wellness (luxeadmin/testpassword123)
  - Hamilton Beauty Spa (HAMILTON/password123)

## 🔧 Common Tasks & Solutions

### Start Everything
```bash
npm run api:dev      # Start API
npm run merchant:dev # Start merchant app
# OR
npm run dev:all      # Start both
```

### Debug Authentication Issues
```bash
# Test login
curl -X POST http://localhost:3000/api/auth/merchant/login \
  -H "Content-Type: application/json" \
  -d '{"username": "luxeadmin", "password": "testpassword123"}'

# Test protected endpoint
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/debug/auth
```

### Fix Common Problems
| Problem | Solution | Prevention |
|---------|----------|------------|
| 403 "User not authenticated" | Check guard order | Always: JWT → Permissions |
| 404 with /api/api/... | Remove 'api' from controller | Check controller decorators |
| Port already in use | `lsof -ti:3000 \| xargs kill -9` | Use npm scripts |
| Module not found '/dist/main' | See "API Won't Start" below | Build packages first |
| ERR_MODULE_NOT_FOUND | Build packages with tsup | Update package.json exports |
| Dialog/Modal not visible | Create custom modal with `fixed inset-0` | Skip complex library components |
| Button seems broken | Check DOM exists → CSS visible → Interactivity | Don't debug backend first |

### API Won't Start - Quick Fix Guide
```bash
# 1. Check if already running
ps aux | grep nest

# 2. Build packages first
cd packages/types && npm run build
cd ../utils && npm run build

# 3. Try direct node execution
cd apps/api
ls dist/  # Check what's there
node dist/main.js  # Try the actual file

# 4. If nothing works, use dev mode
npm run start:dev  # Let it compile on the fly
```

## 📊 Session History & Learnings

### Session 2025-06-06: Form Input Focus Loss Issue
**Duration**: ~45 minutes (multiple attempts needed)
**Problem**: Form inputs losing focus after every keystroke in booking form
**Root Cause**: CustomerForm component was defined INSIDE the parent BookingPage component
**Solution**: Move CustomerForm outside the parent component and use React.memo

**Why It Took Multiple Attempts**:
1. **First Attempts - Wrong Diagnosis**:
   - Thought it was animation re-renders (removed motion.div wrappers)
   - Thought it was the progress bar re-rendering (memoized it)
   - Thought it was the card header re-rendering
   - Fixed CSS transitions from transition-all to transition-colors
   
2. **Missed the Real Issue**:
   - Didn't immediately recognize that components defined inside other components get recreated on every parent render
   - This is a fundamental React pattern but easy to miss when debugging

3. **The Real Problem**:
   ```javascript
   // BAD - Component defined inside parent
   function BookingPage() {
     const [customerInfo, setCustomerInfo] = useState({...});
     
     const CustomerForm = () => {  // ❌ Recreated on every render!
       return <input value={customerInfo.name} onChange={...} />
     }
     
     return <CustomerForm />;
   }
   ```

4. **The Solution**:
   ```javascript
   // GOOD - Component defined outside parent
   const CustomerForm = React.memo(({ customerInfo, onChange }) => {
     return <input value={customerInfo.name} onChange={onChange} />
   });
   
   function BookingPage() {
     const [customerInfo, setCustomerInfo] = useState({...});
     return <CustomerForm customerInfo={customerInfo} onChange={setCustomerInfo} />;
   }
   ```

**Critical Learnings**:
1. **Component Definition Location Matters**: NEVER define components inside other components unless you want them recreated on every render
2. **Focus Loss = Component Recreation**: If inputs lose focus on every keystroke, the component is being destroyed and recreated
3. **Debug Hierarchy**: Check component structure before checking animations, state updates, or CSS
4. **React Fundamentals**: This is basic React - components defined inside render functions are new instances every time

**Pattern to Remember**:
- Input loses focus on typing → Component being recreated → Check where component is defined
- AnimatePresence issues can also cause this but check component definition FIRST

### Session 2025-05-30: Calendar Page Freezing Issue
**Duration**: ~15 minutes (but took 3 attempts)
**Problem**: Calendar page freezing after closing New Booking slider - page becomes unresponsive
**Root Cause**: SlideOutPanel component with `preserveState={true}` kept invisible overlay in DOM
**Solution**: Set `preserveState={false}` on BookingSlideOut component

**Why It Took Multiple Attempts**:
1. **First Attempt - Wrong Root Cause**: 
   - Focused on `document.body.style.overflow` not being reset
   - Added timeouts and forced resets
   - This was a symptom, not the cause

2. **Second Attempt - Partial Understanding**:
   - Found the overlay wasn't getting `pointer-events-none` when invisible
   - Fixed the overlay CSS but didn't realize the real issue
   - Still didn't solve the problem because overlay shouldn't exist at all

3. **Third Attempt - Real Root Cause**:
   - Finally checked the `preserveState` prop behavior
   - Realized `shouldRender` never became false with `preserveState={true}`
   - Invisible components were staying in DOM blocking all interactions

**Key Mistake Pattern**:
```
Symptom: Page frozen/unresponsive
Wrong: Debug body overflow → Add CSS fixes → Add more workarounds
Right: What's blocking clicks? → Invisible elements? → Why are they still there?
```

**Critical Learnings**:
1. **Invisible Elements Can Block Everything**: Elements with `opacity-0` without `pointer-events-none` catch all clicks
2. **State Preservation Has Side Effects**: `preserveState={true}` keeps components in DOM even when "closed"
3. **Debug What's There, Not What Should Be**: Use DevTools to see if invisible elements exist
4. **Component Props Matter**: Default prop values can cause unexpected behavior
5. **Z-Index Layers Are Critical**: High z-index elements (z-40, z-50) will block everything below

**Debugging Strategy for Frozen UI**:
1. Open DevTools → Elements tab
2. Look for high z-index elements (`fixed` position, z-40+)
3. Check if they have `pointer-events-none` when invisible
4. Check if they should exist at all when "closed"
5. Trace back to component lifecycle/state management

**Pattern to Remember**:
- Modal/Slider closes but page frozen = Invisible overlay still exists
- Always check: Does the overlay get removed from DOM or just hidden?
- Component libraries often preserve state by default for performance
- When in doubt, set `preserveState={false}` for modals/sliders

### Session 2025-05-29: UI Component Dialog Issues 
**Duration**: ~90 minutes
**Problem**: Service creation dialog button did nothing - appeared to work but no dialog shown
**Root Cause**: Radix UI Dialog component had portal rendering/z-index conflicts
**Solution**: Replaced complex Radix Dialog with custom modal using reliable CSS positioning

**Debugging Journey & Time Wasted**:
1. **Wrong Problem Diagnosis** (20 mins): Assumed API/auth issues, debugged backend
2. **Component Library Faith** (30 mins): Kept trying to "fix" Radix Dialog with CSS overrides
3. **Incremental Debugging** (25 mins): Fixed authentication, validation, imports - all irrelevant
4. **Portal/Z-index Hunting** (15 mins): Added z-index overrides, portal CSS - still invisible

**Key Mistake Pattern**:
```
Symptom: Button doesn't work
Wrong: Debug API → Auth → Validation → Backend
Right: Debug UI → Can you see it? → Is it clickable? → Does it render?
```

**Critical Learnings**:
1. **Visual Issues Need Visual Debugging**: If something doesn't appear, start with "is it rendered in DOM?"
2. **Component Libraries Aren't Magic**: Complex components (portals, z-index, CSS-in-JS) can fail silently
3. **Simple Solutions Often Win**: Custom `fixed inset-0` modal more reliable than fancy component
4. **Debug in Right Order**: Start with simplest explanation (CSS/positioning) before complex ones (state/API)
5. **Know When to Abandon**: After 3 failed attempts at fixing library component, try custom implementation

**Pattern to Avoid**:
```
1. Complex component doesn't work → Try CSS fixes
2. Still doesn't work → Try more CSS fixes  
3. Still doesn't work → Debug unrelated systems
4. Still doesn't work → More CSS fixes
5. Finally → Rewrite with simple approach ❌
```

**Better Approach**:
```
1. Component doesn't work → Quick check: DOM exists? CSS visible?
2. Still doesn't work → Try simple implementation immediately
3. Simple works → Keep it, document the library issue ✅
```

**UI Debugging Checklist for Future**:
- [ ] Is the element in the DOM? (Inspect element)
- [ ] Is it visible? (Check CSS: display, opacity, z-index)
- [ ] Is it positioned correctly? (Check: fixed, absolute, transform)
- [ ] Is it interactive? (Check: pointer-events, disabled state)
- [ ] ONLY THEN debug state/props/API

### Session 2025-05-27: Authentication Debugging
**Duration**: ~2 hours
**Problem**: E2E tests failing with 403 errors
**Root Cause**: PermissionsGuard was global, executing before JwtAuthGuard
**Solution**: Removed global guard, added to controllers in correct order
**Learnings**:
1. Guard execution order is critical in NestJS
2. Global guards run before controller-level guards
3. Always test with simple endpoints first
4. 500 errors need investigation in service layer

**Mistakes Made**:
- Spent time debugging JWT when auth was actually working
- Initially missed the double /api prefix issue
- Almost killed the terminal with broad pkill command

### Session 2025-05-27: E2E Testing & API Build Loop
**Duration**: ~1 hour
**Problem**: Stuck in repeated API build/startup failures
**Root Cause**: Multiple interconnected issues:
1. NestJS build creates wrong directory structure
2. Packages pointing to .ts files instead of compiled .js
3. Module resolution failures at runtime
4. noEmit: true inherited from parent tsconfig

**Time Wasted**: 
- 30+ minutes trying different tsconfig combinations
- Multiple build attempts with same result
- Debugging module paths that were fundamentally broken

**Key Learning**: Fix API issues immediately!
- Don't work around them - they'll only get worse
- Use the proper scripts (`npm run clean-start`)
- Every workaround creates future problems

**Pattern to Avoid**:
```
1. Try to start API → fails
2. Debug build config → partial fix
3. Build packages → success
4. Rebuild API → different error
5. Debug new error → rabbit hole
6. REPEAT... ❌
```

**Better Approach**:
```
1. API won't start? → Use npm run status & restart ✅
2. Still broken? → Use npm run clean-start ✅
3. Fix root cause → No tech debt ✅
```

## 🎯 Optimization Strategies

### Smart Problem Solving

When facing API issues:
1. **Use the right tools**
   - `npm run status` - What's actually running?
   - `npm run restart` - Clean restart
   - `npm run clean-start` - Full reset with cache clearing

2. **Fix root causes**
   - Port conflicts? → Proper shutdown/startup
   - Build errors? → Build packages first
   - Module errors? → Check package exports

3. **No workarounds**
   - Every shortcut creates debt
   - Fix it now or waste hours later
   - The scripts exist for a reason - use them!

### For Future Sessions
1. **First Steps**:
   ```bash
   ./check-docs.sh          # Quick status check
   cat docs/CHECK_FIRST.md  # Critical warnings
   npm run ps:check         # See what's running
   ```

2. **Before Changing Auth**:
   - Test current state with debug endpoint
   - Check guard order in controllers
   - Never modify global guards

3. **When Debugging**:
   - Start with health check endpoints
   - Use debug endpoints before complex ones
   - Check logs for stack traces on 500 errors

## 📝 Pending Issues

### High Priority
1. **Customer Service**: Returns 500 error
   - Need to debug service implementation
   - Check Prisma queries and relations

2. **Booking Service**: Returns 500 error
   - Validate DTO requirements
   - Check required fields vs provided data

### Low Priority
1. Implement proper error handling
2. Add request logging middleware
3. Create API integration tests

## 🔍 Quick Debug Commands

```bash
# Check API routes
curl http://localhost:3000/api | jq

# Test auth flow
npm run test:auth

# View recent logs
npm run api:logs

# Database status
cd apps/api && npx prisma studio
```

## ⚡ Efficiency Tips

1. **Use the npm scripts** - Don't manually manage processes
2. **Check this file first** - Avoid repeating solved problems
3. **Test incrementally** - Simple endpoints before complex ones
4. **Read error messages** - 403 vs 500 tells you where to look
5. **Keep services running** - Use separate terminals

## 🚦 Current Status Dashboard

| Component | Status | Notes |
|-----------|--------|-------|
| API Server | ✅ Running | Port 3000 |
| Merchant App | ✅ Running | Port 3002 |
| Authentication | ✅ Fixed | Guards properly ordered |
| Customer API | ❌ 500 Error | Service layer issue |
| Booking API | ❌ 500 Error | Service layer issue |
| Service Creation | ✅ Fixed | Custom dialog implementation |
| Database | ✅ Connected | SQLite with test data |

---

## 📸 Screenshots Location

**All screenshots are stored in**: `/home/nirvana9010/projects/heya-pos-remake/screenshots/`

To view the latest screenshot:
```bash
ls -la /home/nirvana9010/projects/heya-pos-remake/screenshots/*.png | tail -5
```

## 📌 Session Checklist

Before starting work:
- [ ] Read this file completely
- [ ] Run `./check-docs.sh`
- [ ] Check what's running: `npm run ps:check`
- [ ] Verify auth works: `curl http://localhost:3000/api/health`

Before making changes:
- [ ] Is this a known issue? Check above
- [ ] Will this affect authentication? Review rules
- [ ] Is there a npm script for this? Check `package.json`

Before ending session:
- [ ] Update this file with new learnings
- [ ] Document any new issues discovered
- [ ] Note what's working/broken
- [ ] Add any new efficiency tips

## 📚 Important Debugging Principles

### Always Investigate Root Causes Before Implementing Workarounds
**Added**: 2025-06-03

When encountering import errors or "missing" components:
1. **FIRST**: Check if the component exists in the codebase
2. **SECOND**: Verify it's exported from package index files
3. **THIRD**: Look for working examples in other files
4. **NEVER**: Jump straight to implementing a workaround

**Example**: Staff page DataTable "missing" - Actually existed in UI package, just needed proper import.

**Cost of Workarounds**:
- Technical debt accumulation
- Loss of features (pagination, sorting, etc.)
- Inconsistent user experience
- More work to fix later

**See**: `/docs/sessions/2025-06-03-component-import-debugging.md` for detailed case study

## 🗄️ Database Seeding and Mock Data Generation
**Added**: 2025-06-11

### Key Learnings from Booking Population Disaster

#### What Went Wrong:
1. **Database Environment Confusion**: Always check which database you're connected to!
   - Local SQLite vs Production PostgreSQL (Supabase)
   - Check `.env` files to understand the current configuration
   - API might be using different DB than scripts

2. **Booking Generation Logic Flaws**:
   - Creating bookings for EVERY staff member in EVERY time slot = 300% overbooking
   - No proper conflict checking before creating bookings
   - Floating point precision issues with prices (13599.869999999999)

3. **Schema Mismatches**:
   - `totalPrice` vs `totalAmount` field names
   - `staffId` vs `providerId` vs `createdById` confusion
   - Missing required fields like `bookingNumber`
   - Payment model requiring `invoiceId` (not just `bookingId`)

#### Best Practices for Database Seeding:

1. **Always Start with Environment Check**:
   ```javascript
   // Check if using local or production DB
   console.log('DATABASE_URL:', process.env.DATABASE_URL);
   ```

2. **Clean Before Seeding**:
   ```javascript
   // Always clean up existing data first
   await prisma.bookingService.deleteMany({});
   await prisma.booking.deleteMany({});
   ```

3. **Use Realistic Constraints**:
   - Max bookings per staff per day: 8-10
   - Proper time slot management (no overlaps)
   - Business hours constraints (9 AM - 6 PM)
   - Day-specific patterns (less on Sundays)

4. **Handle Decimal/Money Properly**:
   ```javascript
   // Use Number() for price calculations
   const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
   ```

5. **Track What You Create**:
   ```javascript
   // Keep track of staff schedules to prevent conflicts
   const staffSchedules = {};
   staff.forEach(s => { staffSchedules[s.id] = []; });
   ```

#### Working Script Template:
```javascript
// 1. Environment check
// 2. Clean existing data
// 3. Get reference data (merchant, staff, services, customers)
// 4. Create bookings with:
//    - Realistic daily limits
//    - Proper status based on date
//    - No overlapping for same staff
//    - Even distribution across days
// 5. Verify results
```

#### Production Stack Reference:
- **API**: Railway (check deployment logs)
- **Database**: Supabase PostgreSQL (not local SQLite!)
- **Frontend**: Vercel

#### Useful Verification Scripts:
- `scripts/check-bookings.js` - Check booking distribution
- `scripts/fix-production-bookings.js` - Fix overbooking issues

#### Common Pitfalls to Avoid:
- ❌ Assuming local SQLite when it's PostgreSQL
- ❌ Creating bookings without checking conflicts
- ❌ Using random probability for EACH staff member
- ❌ Ignoring business hour constraints
- ❌ Not checking existing data before seeding

## 🎯 React Component Patterns and Focus Issues
**Added**: 2025-06-13

### Input Focus Loss - Component Re-creation Pattern

#### The Problem:
When defining component functions inside a parent component's render function, React recreates the component on every render, causing:
- Input fields to lose focus after each keystroke
- Form state to reset
- Poor performance due to unnecessary re-renders

#### Example of WRONG Pattern:
```jsx
export default function SettingsPage() {
  const [value, setValue] = useState("");
  
  // ❌ BAD: Component defined inside parent
  const MyTab = () => (
    <div>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
  
  return <TabsContent><MyTab /></TabsContent>;
}
```

#### The Solution - Two Approaches:

**1. Inline JSX Directly (Preferred for Simple Cases):**
```jsx
export default function SettingsPage() {
  const [value, setValue] = useState("");
  
  return (
    <TabsContent>
      {/* ✅ GOOD: JSX inlined directly */}
      <div>
        <input value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
    </TabsContent>
  );
}
```

**2. Define Component Outside (For Complex Components):**
```jsx
// ✅ GOOD: Component defined outside
const MyTab = ({ value, onChange }) => (
  <div>
    <input value={value} onChange={onChange} />
  </div>
);

export default function SettingsPage() {
  const [value, setValue] = useState("");
  
  return (
    <TabsContent>
      <MyTab value={value} onChange={(e) => setValue(e.target.value)} />
    </TabsContent>
  );
}
```

#### Key Principles:
1. **Never define components inside render functions** - They get recreated every render
2. **For simple JSX, inline it directly** - No need for a component at all
3. **For complex reusable logic, define outside** - True component pattern
4. **Watch for hooks in nested functions** - Can cause "Rules of Hooks" violations

#### Common Scenarios Where This Happens:
- Tab content components in settings pages
- Modal content components
- Dynamically rendered form sections
- List item components defined inline

#### Performance Impact:
- Every parent re-render = new component instance
- React unmounts old component and mounts new one
- DOM elements are destroyed and recreated
- Focus, scroll position, and other state is lost

#### Quick Diagnostic:
If an input loses focus after each keystroke, check if its component is being defined inside another component's render function.