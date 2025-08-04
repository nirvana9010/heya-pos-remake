#!/usr/bin/env python3
import json
import sys

# Read input from Claude Code
data = json.loads(sys.stdin.read())
tool_name = data.get("tool_name", "")
tool_input = data.get("tool_input", {})

# Check if this is an edit operation
if tool_name in ["Edit", "Write", "MultiEdit"]:
    # Get the file path depending on the tool
    file_path = tool_input.get("path") or tool_input.get("file_path", "")
    
    if file_path:
        # Always block and request a read first
        output = {
            "decision": "block",
            "reason": f"Please read {file_path} first before editing. Use the Read tool to check the current file contents, then retry your edit."
        }
        print(json.dumps(output))
        sys.exit(2)  # Exit code 2 for blocking

# For non-edit operations or if no path found, do nothing
sys.exit(0)