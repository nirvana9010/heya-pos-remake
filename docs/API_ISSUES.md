# API Issues Documentation

## Build & Startup Issues

### 1. Module Resolution Error
**Error:**
```
Error: Cannot find module '/home/nirvana9010/projects/heya-pos-remake/heya-pos/apps/api/dist/main'
```

**Root Cause:**
- NestJS expects main.js directly in dist/ folder
- TypeScript compilation creates nested structure based on file paths
- Monorepo package imports causing path resolution issues

**Attempted Fixes:**
1. Added `noEmit: false` to override parent tsconfig
2. Tried adding `rootDir: "./src"` but caused issues with monorepo imports
3. Built packages (@heya-pos/types and @heya-pos/utils) separately
4. Updated package.json files to point to dist files

**Current Status:** 
- Build succeeds but creates wrong directory structure
- main.js ends up in dist/apps/api/src/ instead of dist/

### 2. Package Import Issues
**Error:**
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/nirvana9010/projects/heya-pos-remake/heya-pos/packages/utils/src/date'
```

**Root Cause:**
- Packages were pointing to TypeScript source files instead of compiled JS
- ES module/CommonJS interop issues

**Fix Applied:**
- Built packages with tsup
- Updated package.json to point to dist files
- Added proper exports configuration

### 3. Authentication Issues (RESOLVED)
**Error:**
```
403 Forbidden - User not authenticated
```

**Root Cause:**
- PermissionsGuard was registered globally
- It executed before JwtAuthGuard, preventing authentication

**Fix Applied:**
- Removed PermissionsGuard from global providers
- Added guards to controllers in correct order: JwtAuthGuard, then PermissionsGuard

### 4. Service Implementation Issues
**Error:**
```
500 Internal Server Error on /api/customers and /api/bookings
```

**Root Cause:**
- Service layer implementation issues (not investigated due to API startup problems)

## Recommendations

### Short-term Fix:
1. Create a simple startup script that bypasses nest CLI:
   ```bash
   cd apps/api
   npx tsc
   node dist/apps/api/src/main.js
   ```

2. Or modify nest-cli.json to handle the output structure correctly

### Long-term Fix:
1. Review and fix the build configuration:
   - Ensure tsconfig paths are resolved correctly
   - Consider using webpack or custom build script
   - Align with NestJS best practices for monorepo

2. Consider using nx.dev or lerna for better monorepo management

3. Add proper build scripts to package.json:
   ```json
   "build:packages": "npm run build -ws --if-present",
   "build:api": "npm run build:packages && cd apps/api && nest build"
   ```

## Working Features (Before API Stopped)

1. Authentication endpoints working
2. Database connection established
3. Prisma migrations applied
4. WebSocket gateway initialized

## Environment Details

- Node.js: v20.19.2
- NestJS CLI: 10.4.9
- TypeScript: 5.1.3
- Database: SQLite (working)
- Build Tool: NestJS CLI + tsc