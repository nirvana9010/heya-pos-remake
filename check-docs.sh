#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📚 Heya POS Documentation Check${NC}"
echo "=============================="
echo ""

# CRITICAL: Check AI Memory first
if [ -f "docs/AI_SESSION_MEMORY.md" ]; then
    echo -e "${RED}🧠 AI MEMORY STATUS:${NC}"
    echo -e "${YELLOW}   MUST READ: docs/AI_SESSION_MEMORY.md${NC}"
    echo "   Last updated: $(stat -c %y docs/AI_SESSION_MEMORY.md 2>/dev/null | cut -d' ' -f1 || date -r docs/AI_SESSION_MEMORY.md '+%Y-%m-%d')"
    echo ""
fi

# Check if docs folder exists
if [ -d "docs" ]; then
    echo "✅ Documentation folder found"
    echo ""
    echo "📄 Key Documents:"
    echo "  - docs/CHECK_FIRST.md (⚠️ Read this first!)"
    echo "  - docs/README.md (Project overview)"
    echo "  - docs/testing/E2E_BOOKING_TEST.md (Auth fix details)"
    echo "  - docs/troubleshooting/AUTH_ISSUES.md (Common problems)"
    echo ""
    
    # Show recent changes
    echo "🕒 Recently modified docs:"
    find docs -name "*.md" -type f -mtime -7 -exec ls -la {} \; | tail -5
    
else
    echo "❌ No docs folder found!"
    echo "   This might be a fresh checkout or different branch"
fi

echo ""
echo "🔑 Test Credentials:"
echo "   Username: luxeadmin"
echo "   Password: testpassword123"
echo ""
echo "🌐 URLs:"
echo "   Merchant App: http://localhost:3002"
echo "   API: http://localhost:3000/api"
echo ""
echo "💡 Quick Start: cat docs/CHECK_FIRST.md"