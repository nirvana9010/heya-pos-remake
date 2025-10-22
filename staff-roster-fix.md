# Staff Roster Reset Findings

## Summary
- The production roster lives exclusively in the `StaffSchedule` table (`apps/api/prisma/schema.prisma:160-173`).
- Our Prisma workflow frequently rebuilds the baseline migration, which drops and recreates `StaffSchedule` without a data-preserving step.
- After migrations, the API auto-seeds schedules from business hours (`apps/api/src/staff/staff.service.ts:125-204`) or the `fix-missing-staff-schedules.ts` script.
- Those fallbacks create seven-day, open/close-only shifts, so merchants perceive a “reset to default” while other tables remain intact.

## Next Steps (Post-Restore)
1. Add an explicit data migration that copies existing `StaffSchedule` rows into a staging table before schema changes and restores them afterward.
2. Introduce automated tests (e.g. snapshotting `StaffSchedule`) to fail if migrations wipe roster rows without a restore step.
3. Revisit roster seeding logic so that recovery scripts only fill gaps instead of overwriting every staff member’s custom hours.
