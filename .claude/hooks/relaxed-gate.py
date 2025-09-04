#!/usr/bin/env python3
import json, re, sys, os, pathlib

# Load hook input
data = json.load(sys.stdin)
tool = data.get("tool_name")
input_ = data.get("tool_input", {})

# Skip auto-approval for Task tool (to preserve Plan Mode)
if tool == "Task":
    sys.exit(0)  # Exit without outputting a decision

# ------- 1. Hard-stop shell nukes -------
dangerous_patterns = [
    r'rm\s+-rf\s+/',           # rm -rf /
    r'rm\s+-fr\s+/',           # rm -fr / (different order)
    r'dd\s+.*/dev/',           # dd to devices
    r'mkfs\b',                 # format filesystem
    r'shutdown\b',             # shutdown system
    r'kill\s+-9\s+-1'          # kill all processes
]
nuke = re.compile('|'.join(dangerous_patterns), re.I)

if tool == "Bash":
    command = input_.get("command", "")
    
    # Check for destructive commands first
    if nuke.search(command):
        print(json.dumps({"decision": "block", "reason": "Irreversible destructive shell command"}))
        sys.exit(2)
    
    # Check for kill commands - but be smarter about it
    if re.search(r'\b(kill|pkill|killall)\b', command, re.I):
        # Allow these legitimate use cases:
        allowed_kill_patterns = [
            r'kill\s+-0\s+',           # kill -0 (just checks if process exists)
            r'kill\s+\$',              # kill $VARIABLE (targeted, specific)
            r'kill\s+\d{1,5}$',        # kill specific PID (up to 5 digits)
            r'pkill\s+-f\s+"[^"]{5,}"', # pkill with specific pattern
            r'fuser\s+-k\s+\d{4}/tcp', # fuser killing specific port
            r'lsof.*\|\s*awk.*\|\s*xargs\s+kill', # specific pipeline for port cleanup
        ]
        
        # If it matches any allowed pattern, let it through
        if not any(re.search(pattern, command) for pattern in allowed_kill_patterns):
            # Only block if it's a careless kill command
            if re.search(r'kill\s+-9\s+-1|killall\s+-9|pkill\s+-9\s+(?!-f)', command):
                print(json.dumps({
                    "decision": "block", 
                    "reason": "Dangerous kill command. Use targeted PIDs or the restart script: ./scripts/restart.sh"
                }))
                sys.exit(2)

# ------- 2. Writes outside repo -------
if tool in {"Write", "Edit", "MultiEdit"}:
    path_field = input_.get("file_path") or input_.get("path", "")
    if path_field:
        target = pathlib.Path(path_field).resolve()
        
        # Find the actual project root (where .git or .claude directory is)
        current = pathlib.Path(os.getcwd()).resolve()
        workspace_root = current
        
        # Walk up to find the project root
        while workspace_root.parent != workspace_root:
            if (workspace_root / '.git').exists() or (workspace_root / '.claude').exists():
                break
            workspace_root = workspace_root.parent
        
        # Allow writes anywhere within the project root
        if not str(target).startswith(str(workspace_root)):
            print(json.dumps({"decision": "block", "reason": f"Write outside workspace root ({workspace_root})"}))
            sys.exit(2)

# ------- 3. Unknown outbound fetches -------
if tool in {"WebFetch", "WebSearch"}:
    url = input_.get("url", "")
    # allow calls to GitHub, PyPI, Debian mirrors, official docs; block the rest
    if not any(url.startswith(p) for p in (
        "https://github.com",
        "https://pypi.org",
        "https://deb.debian.org",
        "https://docs."
    )):
        print(json.dumps({"decision": "block", "reason": "External domain not on allow-list"}))
        sys.exit(2)

# Default: approve everything else
print(json.dumps({"decision": "approve", "reason": "relaxed gate"}))