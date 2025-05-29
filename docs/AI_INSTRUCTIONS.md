# 🤖 Instructions for AI Assistant

## On Every New Session

1. **FIRST COMMAND TO RUN**:
   ```bash
   cd /path/to/heya-pos && ./check-docs.sh
   ```

2. **MUST READ**:
   ```bash
   cat docs/AI_SESSION_MEMORY.md
   ```

3. **Before Making ANY Changes**:
   - Check the "Critical Rules" section
   - Review recent session logs
   - Verify current status dashboard

## During the Session

### When Encountering Errors
1. Check if it's a known issue in AI_SESSION_MEMORY.md
2. Don't repeat previous mistakes
3. Update the memory if you find new solutions

### When Making Changes
1. Authentication: Check guard order rules
2. Controllers: Check path prefix rules  
3. Process management: Use specific commands

### Before Ending Session
1. Update AI_SESSION_MEMORY.md with new learnings
2. Create session log if significant work done
3. Update status dashboard

## Memory Update Commands

```bash
# Add new learning
./update-ai-memory.sh

# View current memory
cat docs/AI_SESSION_MEMORY.md

# Check all docs
./check-docs.sh
```

## Example First Actions

```bash
# 1. Check documentation
./check-docs.sh

# 2. Read AI memory
cat docs/AI_SESSION_MEMORY.md

# 3. Check what's running
npm run ps:check

# 4. Verify system health
curl http://localhost:3000/api/health
```

## Key Files to Remember

1. **docs/AI_SESSION_MEMORY.md** - All learnings and rules
2. **docs/CHECK_FIRST.md** - Critical warnings
3. **docs/sessions/** - Session history
4. **package.json** - NPM scripts to use

## Success Metrics

- No repeated mistakes from previous sessions
- Faster problem resolution using documented solutions
- Continuous improvement through session logging
- Efficient use of existing scripts and tools