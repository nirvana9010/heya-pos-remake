# Merchant App Type Backlog Plan (Updated)

## Guardrails
- Keep UI output unchanged: restrict edits to clients, services, data mappers, and pure helpers.
- Wrap every batch with `ENABLE_MERCHANT_TYPECHECK=true npm run typecheck`; add lint or unit runs when touching shared utilities.
- Turbo currently replays cached logs without the env var, so double-check with `npx tsc --noEmit` from `apps/merchant-app` when validating a capsule.
- Capture a baseline set of Playwright screenshots before the final verification sweep and compare after each capsule.
- If a fix would change runtime behaviour, stop and document before proceeding.

## Status Snapshot
- ✅ **API foundations hardened** (`src/lib/clients/base-client.ts`, `src/lib/clients/index.ts`, `src/lib/services/supabase.ts`): interceptors now typed, public request helpers exposed, cache clearer surfaced, and Supabase client guarded against bad tokens.
- ✅ **Bookings domain normalised (core usage)** (`src/lib/clients/bookings-client.ts`, downstream booking consumers, `use-bookings` hooks): `normalizeBooking` in place, local `BookingStatus` union adopted, React Query hooks now typed.
- ✅ **Services listing + hooks normalised** (`src/lib/normalizers/service.ts`, `src/hooks/use-services.ts`, `src/app/(dashboard)/services/**`): `ServiceRecord`/`ServiceCategoryRecord` introduced, paginated responses mapped safely, legacy `page-old` + new table now consume typed data without `any` casts.
- ✅ **Calendar mapper & provider aligned** (`src/components/calendar/refactored/calendar-booking-mapper.ts`, `src/components/calendar/refactored/CalendarProvider.tsx`, `src/contexts/booking-context.tsx`): staff colours respected end-to-end, booking/service ids normalised, filters tolerate unassigned services, and slide-out props now expect typed merchant data.
- ⏳ **Remaining backlogs** cluster around the calendar capsule, customer dashboard, dashboard stats/staff modules, payments + reports flows, feature flags, and utility stragglers; Jest coverage for `normalizeBooking` still outstanding.

## Next Capsules

### 3. Customers Dashboard Normalisation (NEXT)
**Scope**: `src/app/(dashboard)/customers/**`, `src/lib/clients/customers-client.ts`
- Add `normalizeCustomer` + safe numeric helpers to eliminate implicit `any` and `unknown` math.
- Type the dynamic icon import via `dynamic<Module['default']>` and firm up pagination metadata typing.
**Validation**
- Typecheck.
- Playwright or manual customer search/add flow.

### 4. Dashboard Metrics & Staff Alignment
**Scope**: `src/app/(dashboard)/dashboard/dashboard-enhanced.tsx`, `src/app/(dashboard)/staff/**`, `src/app/(dashboard)/profile/page.tsx`, `src/contexts/timezone-context.tsx`
- Reconcile `DashboardStats` state shape, ensure Lucide icon definitions are rendered via `<Icon />` rather than raw references.
- Replace legacy staff type casts with normalized records (mirror the customer/services approach) and surface timezone client helpers from `apiClient.services`.
**Validation**
- `npx tsc --noEmit` (Turbo skips without `ENABLE_MERCHANT_TYPECHECK`, so run TSC directly).
- Manual dashboard + staff detail smoke (load stats, toggle staff PINs, update timezone).

### 5. Payments & Reports Safety Net
**Scope**: `src/app/(dashboard)/payments/page.tsx`, `src/app/(dashboard)/reports/page.tsx`, `src/app/(dashboard)/roster/page.tsx`
- Type the billing address formatter and report refetch handlers, lift common chart typing into a helper to eliminate implicit `any`.
- Normalize roster schedule mutations to concrete array types.
**Validation**
- `npx tsc --noEmit`.
- Payments export + report refresh manual smoke.

### 6. Feature Flags & Notification Contexts
**Scope**: `src/lib/feature-flags.ts`, `src/lib/features/feature-service.ts`, `src/contexts/notifications-context.tsx`, `src/hooks/use-realtime-notifications.ts`
- Create `convertMerchantFeatures` guards, annotate notification metadata, and align realtime payloads with server contract.
**Validation**
- Typecheck + focused Jest check for conversion logic.

### 7. Miscellaneous Utilities & Runtime Glue
**Scope**: `src/lib/console-logger.ts`, `src/lib/auth/get-session.ts`, `src/lib/chunk-error-handler.ts`, `src/hooks/useRobustWebSocket.ts`, `src/lib/query/query-provider.tsx`, `src/lib/services/mock-availability.service.ts`
- Remove duplicate keys, guard optional browser APIs, rewire websocket debug helpers, and lock devtools positioning types.
**Validation**
- Typecheck and `npm run lint`.

## Regression Net (Final Pass)
- Full `npm run lint`, `ENABLE_MERCHANT_TYPECHECK=true npm run typecheck`, and `npm run build`.
- Re-run the Playwright smoke/screenshot suite and diff against the baseline.
- Document any intentional behaviour changes (expected to be none).

## Open Tasks Checklist
- [ ] Add Jest coverage for `normalizeBooking` edge cases (status coercion, multi-service totals, missing dates).
- [x] Calendar capsule (mapper + provider typing realignment).
- [ ] Customers dashboard normalisation.
- [x] Services dashboard cleanup.
- [ ] Dashboard metrics & staff alignment.
- [ ] Payments & reports safety net.
- [ ] Feature flag & notification typing pass.
- [ ] Utility tail clean-up and final regression sweep.
