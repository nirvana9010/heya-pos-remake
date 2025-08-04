#!/usr/bin/env python3
import json, re, sys, os, pathlib

# Load hook input
data = json.load(sys.stdin)
tool = data.get("tool_name")
input_ = data.get("tool_input", {})

# ------- 1. Hard-stop shell nukes -------
# Fixed patterns without problematic word boundaries
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
    if nuke.search(command):
        print(json.dumps({"decision": "block", "reason": "Irreversible destructive shell command"}))
        sys.exit(2)

# ------- 2. Writes outside repo -------
if tool in {"Write", "Edit", "MultiEdit"}:
    path_field = input_.get("file_path") or input_.get("path", "")
    if path_field:
        target = pathlib.Path(path_field).resolve()
        if not str(target).startswith(os.getcwd()):
            print(json.dumps({"decision": "block", "reason": "Write outside workspace"}))
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
sys.exit(0)