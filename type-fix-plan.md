# Merchant App Type Backlog Plan (Updated)

## Guardrails
- Keep UI output unchanged: restrict edits to clients, services, data mappers, and pure helpers.
- Wrap every batch with `ENABLE_MERCHANT_TYPECHECK=true npm run typecheck`; add lint or unit runs when touching shared utilities.
- Capture a baseline set of Playwright screenshots before the final verification sweep and compare after each capsule.
- If a fix would change runtime behaviour, stop and document before proceeding.

## Status Snapshot
- ✅ **API foundations hardened** (`src/lib/clients/base-client.ts`, `src/lib/clients/index.ts`, `src/lib/services/supabase.ts`): interceptors now typed, public request helpers exposed, cache clearer surfaced, and Supabase client guarded against bad tokens.
- ✅ **Bookings domain normalised (core usage)** (`src/lib/clients/bookings-client.ts`, downstream booking consumers, `use-bookings` hooks): `normalizeBooking` in place, local `BookingStatus` union adopted, React Query hooks now typed.
- ⏳ **Remaining backlogs** sit in the calendar module, customers dashboard, feature flags, and utility stragglers; Jest coverage for `normalizeBooking` still outstanding.

## Next Capsules

### 3. Calendar Module Alignment (NEXT)
**Scope**: `src/components/calendar/refactored/**`, `src/contexts/booking-context.tsx`
- Map API payloads through `normalizeBooking` (or a calendar-specific mapper) before hitting state; remove legacy status strings.
- Bring `CalendarState`/`CalendarActions` typings back in sync (`deleteBooking`, status filters, etc.).
- Plug gaps in the provider (listener typing, recent update maps) and make slide-out props satisfy the refined booking shape.
**Validation**
- `ENABLE_MERCHANT_TYPECHECK=true npm run typecheck`
- Manual calendar drag/drop + status update smoke; re-run baseline screenshot diff if possible.

### 4. Customers Dashboard Normalisation
**Scope**: `src/app/(dashboard)/customers/**`, `src/lib/clients/customers-client.ts`
- Add `normalizeCustomer` + safe numeric helpers to eliminate implicit `any` and `unknown` math.
- Type the dynamic icon import via `dynamic<Module['default']>` and firm up pagination metadata typing.
**Validation**
- Typecheck.
- Playwright or manual customer search/add flow.

### 5. Services Dashboard Cleanup
**Scope**: `src/app/(dashboard)/services/ServicesPageContent.tsx`, services client usages
- Replace deprecated generic API calls with `apiClient.services` methods.
- Introduce a `normalizeServiceRow` helper to guarantee `categoryName`, `staffCount`, etc.
**Validation**
- Typecheck.
- Services CRUD smoke.

### 6. Feature Flags Consistency
**Scope**: `src/lib/feature-flags.ts`, `src/lib/features/feature-service.ts`, `src/lib/clients/features-client.ts`
- Create `convertMerchantFeatures` and tighten store typing so enabled/disabled maps are explicit.
**Validation**
- Typecheck + focused Jest check for conversion logic.

### 7. Miscellaneous Utilities
**Scope**: `src/lib/console-logger.ts`, `src/components/PaymentDialog.tsx`, `src/hooks/useWebSocketWithRefresh.ts`, etc.
- Strip duplicate object keys, add null guards, and apply `satisfies`/`as const` casts to quiet the tail of errors.
**Validation**
- Typecheck and `npm run lint`.

## Regression Net (Final Pass)
- Full `npm run lint`, `ENABLE_MERCHANT_TYPECHECK=true npm run typecheck`, and `npm run build`.
- Re-run the Playwright smoke/screenshot suite and diff against the baseline.
- Document any intentional behaviour changes (expected to be none).

## Open Tasks Checklist
- [ ] Add Jest coverage for `normalizeBooking` edge cases (status coercion, multi-service totals, missing dates).
- [ ] Calendar capsule (mapper + provider typing realignment).
- [ ] Customers dashboard normalisation.
- [ ] Services dashboard cleanup.
- [ ] Feature flag typing pass.
- [ ] Utility tail clean-up and final regression sweep.
