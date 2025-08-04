# To Clear React Query Cache and Force Fresh Data:

1. Open browser Developer Tools (F12)
2. Go to the Console tab
3. Run this command:
```javascript
// Clear all React Query caches
window.localStorage.clear();
window.sessionStorage.clear();
```

4. Then do a hard refresh:
   - Windows/Linux: Ctrl + Shift + R
   - Mac: Cmd + Shift + R

5. Or clear cache completely:
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"