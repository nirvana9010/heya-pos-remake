#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧠 AI Memory Update System${NC}"
echo "=========================="
echo ""

# Function to add a learning
add_learning() {
    echo -e "${YELLOW}What did you learn? (one line):${NC}"
    read -r learning
    
    echo -e "${YELLOW}Category? (auth/api/database/ui/testing/other):${NC}"
    read -r category
    
    echo -e "${YELLOW}Was this a mistake to avoid? (y/n):${NC}"
    read -r is_mistake
    
    # Add to AI memory file
    if [ "$is_mistake" = "y" ]; then
        sed -i '/## 🎯 Optimization Strategies/i\
\
### New Learning ('$(date +%Y-%m-%d)')\
**Category**: '"$category"'\
**Type**: MISTAKE TO AVOID\
**Learning**: '"$learning"'\
' docs/AI_SESSION_MEMORY.md
    else
        sed -i '/## 🎯 Optimization Strategies/i\
\
### New Learning ('$(date +%Y-%m-%d)')\
**Category**: '"$category"'\
**Type**: Best Practice\
**Learning**: '"$learning"'\
' docs/AI_SESSION_MEMORY.md
    fi
    
    echo -e "${GREEN}✅ Learning added to AI memory${NC}"
}

# Function to update status
update_status() {
    echo -e "${YELLOW}What component? (api/ui/auth/database/other):${NC}"
    read -r component
    
    echo -e "${YELLOW}Status? (working/broken/partial):${NC}"
    read -r status
    
    echo -e "${YELLOW}Notes?:${NC}"
    read -r notes
    
    # This would update the status dashboard in the AI memory
    echo -e "${GREEN}✅ Status updated${NC}"
}

# Main menu
echo "What would you like to do?"
echo "1) Add a new learning"
echo "2) Update component status"
echo "3) Create session summary"
echo "4) View current AI memory"
echo ""
echo -n "Choice (1-4): "
read -r choice

case $choice in
    1)
        add_learning
        ;;
    2)
        update_status
        ;;
    3)
        echo -e "${YELLOW}Creating session summary...${NC}"
        DATE=$(date +%Y-%m-%d-%H%M)
        cp docs/sessions/template.md "docs/sessions/$DATE-session.md"
        echo -e "${GREEN}✅ Created: docs/sessions/$DATE-session.md${NC}"
        ;;
    4)
        less docs/AI_SESSION_MEMORY.md
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        ;;
esac

echo ""
echo -e "${GREEN}Remember to commit your documentation updates!${NC}"