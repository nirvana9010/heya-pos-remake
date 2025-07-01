# Feature: [FEATURE_NAME]

**Date Implemented**: [DATE]  
**Implemented By**: Claude Code Session  
**Risk Level**: HIGH / MEDIUM / LOW  
**Related Ticket/Issue**: #[NUMBER]

## 📋 Quick Reference

**What It Does**: [One sentence description]  
**Where To Find It**: [Primary file/component location]  
**How To Test It**: `npm run test -- [specific test name or pattern]`  
**Key Dependencies**: [List 2-3 most critical dependencies]

## 🎯 Business Context

### Why This Feature Exists
[Explain the business problem this solves]

### User Story
As a [user type], I want to [action] so that [benefit].

### Success Metrics
- [ ] [How do we measure if this is successful?]
- [ ] [What user behavior indicates this is working?]
- [ ] [What business metric does this improve?]

## 🏗️ Technical Implementation

### Architecture Decision
[Brief explanation of the approach taken and why]

### Files Modified/Created
```
CREATED:
- [filepath] - [Purpose of this file]
- [filepath] - [Purpose of this file]

MODIFIED:
- [filepath]
  - Added: [What functionality was added]
  - Changed: [What existing functionality was modified]
  - Reason: [Why this change was necessary]
```

### Database Changes
```sql
-- Document any schema changes, migrations, or new indexes
-- Include both the change and the rollback if needed
```

### API Changes
```typescript
// Document new or modified endpoints
[METHOD] [endpoint]
  Request: { [structure] }
  Response: { [structure] }
  Breaking change: YES/NO
```

### Key Components/Functions
```typescript
// List the main components or functions created
[Component/Function Name]
  Location: [filepath]
  Purpose: [what it does]
  Used by: [what consumes this]
```

## 🔗 Integration Points

### Upstream Dependencies
[What this feature needs to work - be specific]
- [ ] [System/Component] - [How it's used]
- [ ] [System/Component] - [How it's used]

### Downstream Impact
[What other features/systems are affected by this]
- [ ] [System/Component] - [How it's affected]
- [ ] [System/Component] - [How it's affected]

### Critical Paths
[List the main user flows that use this feature]
1. [User flow description]
2. [User flow description]

## 🧪 Testing

### Automated Tests
```bash
# Unit tests
[test command]

# Integration tests  
[test command]

# E2E tests
[test command]
```

### Manual Testing Checklist
- [ ] [Step 1 to verify feature works]
- [ ] [Step 2 - include specific values/scenarios]
- [ ] [Edge case to test]
- [ ] [Another edge case]

## ⚠️ Edge Cases & Gotchas

### Handled Edge Cases
- ✅ [Edge case] - [How it's handled]
- ✅ [Edge case] - [How it's handled]

### Known Limitations
- ⚠️ [Limitation] - [Why it exists, impact]
- ⚠️ [Limitation] - [Potential workaround]

### Performance Notes
[Any performance implications or optimizations made]

## 🐛 Debugging Guide

### Common Issues

**Issue**: [Description of problem user might see]
- Check: [First thing to verify]
- Check: [Second thing to check]
- Fix: [How to resolve]

**Issue**: [Another common problem]
- Check: [Diagnostic step]
- Fix: [Solution]

### Debug Commands
```bash
# Helpful commands for debugging this feature
[command] - [what it shows]
[command] - [what it shows]
```

### Key Log Entries
```
[LOG_PREFIX] [What to look for in logs]
[LOG_PREFIX] [Another important log pattern]
```

## 🔄 Maintenance Notes

### Safe to Modify
- ✅ [What can be changed without risk]
- ✅ [Another safe modification]

### Modify with Caution
- ⚠️ [What requires careful testing]
- ⚠️ [Another risky area]

### Do NOT Modify Without Full Understanding
- ❌ [Critical code that could break everything]
- ❌ [Another danger zone]

## 📊 Monitoring

### Metrics to Track
- [Metric name] - [Why it matters]
- [Metric name] - [Expected range]

### Alerts to Configure
- [Condition] - [Why this indicates a problem]
- [Condition] - [Severity and response]

## 🔗 Related Documentation

- [Link to related feature doc]
- [Link to architecture doc]
- [Link to external documentation]

## 📝 Additional Notes

[Any other important information, decisions made during implementation, or context that doesn't fit above]

---

**Last Updated**: [DATE]  
**Next Review Date**: [DATE + 3 months]

<!-- 
Template Usage Notes:
- Fill in all sections, even if briefly
- Use specific examples rather than vague descriptions
- Include actual commands and code snippets
- Focus on the "why" not just the "what"
- Update this doc when bugs are found or changes made
-->