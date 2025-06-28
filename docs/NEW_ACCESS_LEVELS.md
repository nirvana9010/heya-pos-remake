# MVP Role-Based Authentication System

## Overview
Transition from single merchant login to three role-based logins per business (Owner, Manager, Employee) for better security and access control.

## Current System
- **Single shared login** per business (e.g., `admin@hamiltonbeauty.com`)
- **Individual staff PINs** stored in database but only mock verification implemented
- **PIN-protected pages** like Reports require PIN entry every time

## New System - Simple MVP Approach

### Three Logins Per Business
Each business gets three separate login credentials:
- **Owner**: `owner@businessname.com` - Full system access
- **Manager**: `manager@businessname.com` - Operational access (no financial reports/settings)
- **Employee**: `staff@businessname.com` - Basic POS functions with PIN for sensitive actions

### Examples
**Hamilton Beauty:**
- `owner@hamiltonbeauty.com` / password
- `manager@hamiltonbeauty.com` / password
- `staff@hamiltonbeauty.com` / password

**Zen Wellness:**
- `owner@zenwellness.com` / password
- `manager@zenwellness.com` / password
- `staff@zenwellness.com` / password

## Implementation (1 Week)

### Phase 1: Backend Changes (Day 1-2)

#### Option A: Modify Existing MerchantAuth (Simpler)
```prisma
model MerchantAuth {
  // ... existing fields ...
  role      String   @default("OWNER") // OWNER, MANAGER, EMPLOYEE
  
  @@unique([merchantId, role]) // One login per role per merchant
}
```

#### Option B: New RoleAuth Table (Cleaner)
```prisma
model RoleAuth {
  id           String    @id @default(uuid())
  merchantId   String
  role         String    // "OWNER", "MANAGER", "EMPLOYEE"
  email        String    @unique
  passwordHash String
  isActive     Boolean   @default(true)
  lastLoginAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  merchant     Merchant  @relation(fields: [merchantId], references: [id])
  
  @@unique([merchantId, role])
}
```

### Phase 2: Frontend Changes (Day 3-4)
1. **No changes to login page** - Just username/password as before
2. **Update auth context** to include role from backend
3. **Hide menu items** based on role
4. **Add RoleGuard component** for page protection
5. **Show role indicator** in topbar (e.g., "Logged in as: Owner")

### Phase 3: Migration & Deploy (Day 5)
1. Run migration script:
   - Current login becomes OWNER
   - Create MANAGER and EMPLOYEE logins with temporary passwords
   - Email merchants their new credentials
2. Deploy and monitor

## Access Control Matrix (MVP)

| Feature | Owner | Manager | Employee | Notes |
|---------|-------|---------|----------|-------|
| Dashboard | ✓ | ✓ | ✓ | All see basic stats |
| Calendar | ✓ | ✓ | ✓ | Core functionality |
| Bookings | ✓ | ✓ | ✓ | Create/edit/view |
| Customers | ✓ | ✓ | ✓ | Basic CRM for all |
| Services | ✓ | ✓ | View only | Employees can't edit |
| Staff | ✓ | ✗ | ✗ | Owner manages staff |
| Payments | ✓ | ✓ | ✗ | No payment access for employees |
| Reports | ✓ | ✗ | ✗ | Financial data restricted |
| Settings | ✓ | ✗ | ✗ | System configuration |
| Notifications | ✓ | ✓ | ✓ | All see their own |

## PIN Requirements (Employee Role Only)

When logged in as employee, these actions require their individual staff PIN:

| Action | Threshold | Why |
|--------|-----------|-----|
| Cancel booking | After 2 hours notice | Policy exception |
| Process refund | Over $50 | Financial risk |
| Apply discount | Over 20% | Revenue protection |

That's it! Keep it simple for MVP.

## What We're NOT Doing (MVP)
- ❌ Complex username formats
- ❌ Role selector buttons on login
- ❌ Audit logging
- ❌ Password complexity rules
- ❌ Different session timeouts
- ❌ Feature flags
- ❌ Backward compatibility (clean migration)
- ❌ Performance optimizations

## Simple Migration Script
```typescript
// For each merchant:
async function migrateMerchant(merchant) {
  const currentAuth = await getMerchantAuth(merchant.id);
  
  // Current login becomes owner
  await createRoleAuth({
    merchantId: merchant.id,
    role: 'OWNER',
    email: `owner@${merchant.subdomain}.com`,
    passwordHash: currentAuth.passwordHash // Keep same password
  });
  
  // Create manager and employee with temp passwords
  await createRoleAuth({
    merchantId: merchant.id,
    role: 'MANAGER',
    email: `manager@${merchant.subdomain}.com`,
    passwordHash: hash('ChangeMeManager123!')
  });
  
  await createRoleAuth({
    merchantId: merchant.id,
    role: 'EMPLOYEE',
    email: `staff@${merchant.subdomain}.com`,
    passwordHash: hash('ChangeMeStaff123!')
  });
  
  // Email merchant the new credentials
  await sendMigrationEmail(merchant.email, credentials);
}
```

## User Experience

### Login Flow (No Changes!)
1. Enter email/password
2. System determines role from credentials
3. Redirect to dashboard with appropriate access

### Visual Indicators
- Small role badge in topbar: "Owner", "Manager", or "Staff"
- Different subtle color accent per role (optional)
- Locked features show lock icon with "Owner only" tooltip

### Employee PIN Entry
- Simple numeric pad modal
- Shows staff member name
- Clear error messages
- No complex flows

## Benefits
- **Security**: No more shared passwords
- **Clarity**: Clear who can access what
- **Simplicity**: Minimal changes to current system
- **Scalability**: Easy to add more roles later

## Success Metrics
- All merchants migrated in 1 week
- Zero breaking changes
- Support tickets < 5% of user base
- Positive feedback on security improvement

## Future Enhancements (Post-MVP)
- Individual staff logins (not shared employee login)
- Two-factor authentication
- More granular permissions
- Audit trail
- API key access

## Summary
This MVP approach delivers essential security improvements with minimal complexity. Each business gets three logins (owner/manager/employee), role determines access automatically, and employees still use PINs for sensitive actions. Simple, secure, and shippable in one week.