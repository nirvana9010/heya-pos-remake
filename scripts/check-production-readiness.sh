#!/bin/bash

echo "🔍 Checking for production readiness issues..."
echo ""

ISSUES_FOUND=0

# Check for hardcoded paths
echo "1. Checking for hardcoded file paths..."
if grep -r "/home/\|/Users/\|C:\\\\" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist apps/ 2>/dev/null | grep -v "test\|spec\|debug"; then
    echo "❌ Found hardcoded paths that will fail in production"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ No hardcoded paths found"
fi
echo ""

# Check for file system operations
echo "2. Checking for file system operations..."
if grep -r "fs\.\(writeFile\|appendFile\|readFile\)" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist apps/ 2>/dev/null | grep -v "test\|spec"; then
    echo "❌ Found file system operations that may fail in production"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ No problematic file system operations found"
fi
echo ""

# Check for debug/test endpoints
echo "3. Checking for debug/test endpoints..."
if find apps -type f \( -name "*.ts" -o -name "*.tsx" \) -path "*/app/*" | grep -E "(test|debug|demo)" | grep -v "__tests__" | grep -v ".test." | grep -v "node_modules"; then
    echo "❌ Found test/debug pages that shouldn't be in production"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ No test/debug endpoints found"
fi
echo ""

# Check for localhost references
echo "4. Checking for hardcoded localhost URLs..."
if grep -r "localhost:[0-9]\+" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist apps/ 2>/dev/null | grep -v "env\|ENV\|process.env\|example\|comment"; then
    echo "❌ Found hardcoded localhost URLs"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ No hardcoded localhost URLs found"
fi
echo ""

# Check for console.log statements
echo "5. Checking for excessive console.log statements..."
CONSOLE_COUNT=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist apps/ 2>/dev/null | wc -l)
if [ $CONSOLE_COUNT -gt 50 ]; then
    echo "❌ Found $CONSOLE_COUNT console.log statements (should be removed for production)"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "✅ Acceptable number of console.log statements ($CONSOLE_COUNT)"
fi
echo ""

# Check for TODO/FIXME/HACK comments
echo "6. Checking for TODO/FIXME/HACK comments..."
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist apps/ 2>/dev/null | wc -l)
if [ $TODO_COUNT -gt 20 ]; then
    echo "⚠️  Found $TODO_COUNT TODO/FIXME/HACK comments (review before production)"
    echo "Run: grep -r 'TODO\|FIXME\|HACK' --include='*.ts' --include='*.tsx' apps/ | head -20"
else
    echo "✅ Acceptable number of TODO comments ($TODO_COUNT)"
fi
echo ""

# Check for environment variable usage without defaults
echo "7. Checking for environment variables without defaults..."
if grep -r "process\.env\.[A-Z_]\+" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist apps/ | grep -v "||" | grep -v "??" | grep -v ".env" | head -10; then
    echo "⚠️  Found environment variables used without defaults (may cause issues if not set)"
fi
echo ""

# Summary
echo "================================================"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo "✅ No critical production issues found!"
else
    echo "❌ Found $ISSUES_FOUND critical issues that need to be fixed"
fi
echo "================================================"

exit $ISSUES_FOUND