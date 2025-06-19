# CLAUDE CODE MANDATORY TASK CHECKLISTS

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

Phase 1 checklist:
- Read the complete error message
- Identify error type  
- Check if services are running
- Note exact file and line number

Shall I proceed?"
```

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
- [ ] Create/modify database schema if needed
- [ ] Implement service method with minimal logic
- [ ] Add controller endpoint
- [ ] Test with curl/simple request: `curl http://localhost:3000/api/endpoint`
- [ ] Verify response structure
- [ ] Add validation/error handling
- [ ] Add complete business logic
- [ ] Test edge cases

### PHASE 4: VERIFICATION
- [ ] Test happy path
- [ ] Test error cases
- [ ] Check logs for warnings: `tail -50 logs/api.log | grep -i "warn\|error"`
- [ ] Ensure no existing functionality broken
```

## 🔍 DEBUGGING/FIXING CHECKLIST

When something isn't working:

```markdown
### PHASE 1: UNDERSTAND THE PROBLEM
- [ ] Read the COMPLETE error message (not just the first line)
- [ ] Identify error type: Compilation? Runtime? Logic? Network?
- [ ] Check if services are running: `ps aux | grep -E "node|nest|next" | grep -v grep`
- [ ] Note the exact file and line number if provided

### PHASE 2: INVESTIGATE
- [ ] Check recent changes: `git status` and `git diff`
- [ ] Look for similar working code: How does it handle this?
- [ ] Verify assumptions: "Does this model/endpoint/service actually exist?"
- [ ] Check logs for additional context: `tail -100 logs/api.log`

### PHASE 3: MINIMAL FIX
- [ ] Fix ONLY the immediate issue (no refactoring yet)
- [ ] Test the specific failing case
- [ ] Verify fix doesn't break other things
- [ ] If still broken after 2 attempts, try different approach

### PHASE 4: VERIFY & CLEANUP
- [ ] Run the original failing operation
- [ ] Test related functionality
- [ ] Clean up any debug code
- [ ] Document the fix if non-obvious
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
- [ ] Find API documentation or existing usage
- [ ] Identify authentication method
- [ ] Note base URL and endpoints needed
- [ ] Check for rate limits or restrictions

### PHASE 2: MINIMAL INTEGRATION
- [ ] Test with curl first: `curl -X GET http://api/endpoint -H "Auth: token"`
- [ ] Create simple service method
- [ ] Handle basic errors (network, auth)
- [ ] Log requests and responses

### PHASE 3: ROBUST INTEGRATION
- [ ] Add proper error handling
- [ ] Implement retry logic if appropriate
- [ ] Add request/response typing
- [ ] Cache responses if applicable

### PHASE 4: TESTING
- [ ] Test success cases
- [ ] Test failure cases (wrong auth, 404, 500)
- [ ] Test timeout handling
- [ ] Verify no sensitive data in logs
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

## 📝 UNIVERSAL RULES

Apply these to EVERY task:

1. **ONE CHANGE AT A TIME**: Never modify multiple things simultaneously
2. **TEST AFTER EACH STEP**: Verify still working before proceeding
3. **READ ERRORS COMPLETELY**: The solution is often in the error message
4. **USE EXISTING PATTERNS**: The codebase already shows the way
5. **SIMPLE BEFORE COMPLEX**: Get basic version working first
6. **LOG EVERYTHING**: Clear console output at each step
7. **FAIL FAST**: If stuck after 2 attempts, try different approach

## 🎯 COMPLETION CRITERIA

Before considering ANY task complete:

- [ ] Feature/fix works as requested
- [ ] No new errors in logs
- [ ] Related functionality still works
- [ ] Code follows existing patterns
- [ ] Test script created if applicable
- [ ] Can be run multiple times successfully