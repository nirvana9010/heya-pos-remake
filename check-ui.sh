#!/bin/bash
curl -s http://localhost:3002/ > /tmp/merchant-ui.html
echo "=== Page Size: $(wc -c < /tmp/merchant-ui.html) bytes ==="
echo "=== Checking for CSS ==="
grep -E "(stylesheet|\.css)" /tmp/merchant-ui.html | head -5
echo "=== Checking for Tailwind classes ==="
grep -o "className=\"[^\"]*\"" /tmp/merchant-ui.html | head -5
echo "=== Page Title ==="
grep -o "<title>[^<]*</title>" /tmp/merchant-ui.html