#!/bin/bash

echo "=== Scanning for Exposed Secrets ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any issues found
issues_found=0

# Check for .env files in git
echo "Checking for .env files tracked in git..."
env_in_git=$(git ls-files | grep -E '\.env($|\.)' | grep -v '\.example')
if [ -n "$env_in_git" ]; then
    echo -e "${RED}❌ Found .env files in git:${NC}"
    echo "$env_in_git"
    issues_found=1
else
    echo -e "${GREEN}✅ No .env files tracked in git${NC}"
fi
echo ""

# Check for hardcoded secrets in code
echo "Scanning for potential hardcoded secrets..."

# Common patterns to check
patterns=(
    'password\s*=\s*["\x27][^"\x27]{8,}'
    'api[_-]?key\s*=\s*["\x27][^"\x27]{10,}'
    'secret\s*=\s*["\x27][^"\x27]{10,}'
    'token\s*=\s*["\x27][^"\x27]{10,}'
    'SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}'
    'AC[a-z0-9]{32}'
    'sk_[a-zA-Z0-9]{32}'
)

for pattern in "${patterns[@]}"; do
    # Search in tracked files only, excluding examples and tests
    matches=$(git grep -E "$pattern" -- ':(exclude)*.example' ':(exclude)*.test.*' ':(exclude)*test*' ':(exclude)node_modules' 2>/dev/null || true)
    if [ -n "$matches" ]; then
        echo -e "${YELLOW}⚠️  Potential secrets found for pattern: $pattern${NC}"
        echo "$matches" | head -5
        echo "..."
        issues_found=1
    fi
done

if [ $issues_found -eq 0 ]; then
    echo -e "${GREEN}✅ No obvious hardcoded secrets found${NC}"
fi
echo ""

# Check .gitignore coverage
echo "Checking .gitignore coverage..."
missing_gitignore=()

# Check each app directory
for app in apps/*; do
    if [ -d "$app" ] && [ ! -f "$app/.gitignore" ]; then
        missing_gitignore+=("$app")
    fi
done

if [ ${#missing_gitignore[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing .gitignore in:${NC}"
    printf '%s\n' "${missing_gitignore[@]}"
else
    echo -e "${GREEN}✅ All app directories have .gitignore files${NC}"
fi
echo ""

# Summary
echo "=== Summary ==="
if [ $issues_found -eq 0 ]; then
    echo -e "${GREEN}✅ No security issues found!${NC}"
    echo ""
    echo "Best practices reminder:"
    echo "- Always use .env.example files as templates"
    echo "- Never commit real credentials"
    echo "- Rotate credentials regularly"
    echo "- Use different credentials for each environment"
else
    echo -e "${RED}❌ Security issues found! Please fix them before pushing.${NC}"
    echo ""
    echo "To fix:"
    echo "1. Remove any .env files from git: git rm --cached <file>"
    echo "2. Replace hardcoded secrets with environment variables"
    echo "3. Add sensitive files to .gitignore"
    echo "4. Rotate any exposed credentials"
fi