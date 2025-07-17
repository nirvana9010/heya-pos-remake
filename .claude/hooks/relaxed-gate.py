#!/usr/bin/env python3
import json, re, sys, os, pathlib

# Load hook input
data = json.load(sys.stdin)
tool = data.get("tool_name")
input_ = data.get("tool_input", {})

# ------- 1. Hard-stop shell nukes -------
nuke = re.compile(r'\b(rm\s+-rf\s+/|dd\s+.+/dev/|mkfs\b|shutdown\b|kill\s+-9\s+-1)\b', re.I)
if tool == "Bash" and nuke.search(input_.get("command", "")):
    print(json.dumps({"decision": "deny", "reason": "Irreversible destructive shell command"}))
    sys.exit(0)

# ------- 2. Writes outside repo -------
if tool in {"Write", "Edit", "MultiEdit"}:
    target = pathlib.Path(input_.get("file_path", "")).resolve()
    if not str(target).startswith(os.getcwd()):
        print(json.dumps({"decision": "deny", "reason": "Write outside workspace"}))
        sys.exit(0)

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
        print(json.dumps({"decision": "deny", "reason": "External domain not on allow-list"}))
        sys.exit(0)

# Default: approve everything else
print(json.dumps({"decision": "approve", "reason": "relaxed gate"}))
