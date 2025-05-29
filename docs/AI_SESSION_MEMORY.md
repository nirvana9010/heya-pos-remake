# 🧠 AI Session Memory - Heya POS Project

> **ALWAYS READ THIS FILE FIRST** before making any changes to the project.
> Last Updated: 2025-05-27 2:45 PM
> 
> **SMART RULE**: Assess if mockApi can accomplish the task BEFORE debugging API issues!

## ⚡ Quick Decision Tree

```
API won't start?
├─ Try once: `cd apps/api && npm run start:dev`
├─ Still failing? → CHECK TASK REQUIREMENTS:
│   ├─ Can use mockApi? → USE IT ✅
│   └─ MUST use real API? → See "When Real API is Required" below
└─ Don't debug blindly → Have a clear fix strategy

Need to test UI?
├─ API running? → Use real API
├─ API broken? → Use mockApi (if possible)
└─ Don't wait → Complete what you can

Repeated error pattern?
├─ Same error 3+ times? → STOP
├─ Check this file for solution
└─ If not here → Add it after fixing
```

### When Real API is Required (Can't Use MockApi)

**MUST use real API for:**
1. **Database Operations**
   - Data persistence testing
   - Database migrations
   - Seeding test data
   - Testing transactions

2. **Authentication Testing**
   - JWT token generation/validation
   - Session management
   - Permission checking
   - Security testing

3. **Integration Testing**
   - Third-party service integration
   - WebSocket real-time features
   - File uploads
   - Email sending

4. **Performance Testing**
   - Load testing
   - Query optimization
   - Caching behavior

5. **API-Specific Features**
   - Swagger documentation
   - API versioning
   - Rate limiting
   - CORS configuration

**If Real API is Required:**
```bash
# 1. Focus on the specific error
cat apps/api/api.log | tail -50

# 2. Try the simple fix first
cd apps/api && node dist/main.js

# 3. If module errors, try dev mode
npm run start:dev

# 4. Last resort - fresh build
rm -rf dist node_modules
npm install
npm run build:packages
npm run build
```

## 🚨 Critical Rules - DO NOT VIOLATE

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
- **NEVER** waste time debugging API module resolution errors
- **ALWAYS** check if API is already built: `ls apps/api/dist/`
- **PROBLEM**: NestJS build creates nested structure (dist/apps/api/src/main.js)
- **QUICK FIX**: `cd apps/api && node dist/main.js` (if exists)
- **WHY**: Monorepo + TypeScript paths = complex build issues

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

**Key Learning**: STOP trying to fix API build issues during testing!
- Use mockApi for UI testing
- Document API issues and move on
- Come back to API fixes in dedicated session

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
1. API won't start? → Use mockApi ✅
2. Document the issue → Move on ✅
3. Complete the user's task → Success ✅
```

## 🎯 Optimization Strategies

### Smart Task Assessment

Before diving into fixes, ask:
1. **What's the actual goal?**
   - UI testing? → MockApi probably fine
   - Database testing? → Need real API
   - Feature demo? → MockApi often sufficient

2. **What's the time budget?**
   - Quick task? → Use mockApi
   - Deep dive session? → Fix the API
   - Mixed tasks? → Start with mockApi, fix API later

3. **What's blocking progress?**
   - Just API startup? → Try workarounds
   - Fundamental architecture issue? → Needs proper fix
   - Unknown? → Try mockApi first to understand

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