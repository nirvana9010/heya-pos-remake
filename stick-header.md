# Calendar Sticky Header Investigation

## Date
September 27, 2025

## Context
The merchant calendar should keep the staff header row visible while scrolling. Previous attempts added `sticky` utility classes, but the header still scrolls away. UI refactor introduced nested flex layouts (`DashboardLayout` → `Topbar` sticky → calendar content) which might interfere with sticky positioning.

## Current Layout Findings
- **Topbar** (`src/components/layout/topbar.tsx`) is `position: sticky` with `z-index: 40` at the top of the viewport.
- **DashboardLayout** wraps content in `<main style={{ flex: 1, overflowY: 'auto' }}>`. Sticky elements must share the same scrolling container; this main element likely becomes the scroll context instead of `window`.
- **CalendarPage** outer shell (`CalendarPage.tsx`) applies `min-h-screen flex flex-col` and sets header as `sticky top-0 z-30`. However, inside `DailyView` the staff row uses `sticky top-16` to sit below a secondary toolbar. Because the scrollable region is the `main` element (not the browser window), `sticky` reference should be relative to that scrolling container.
- The calendar grid is nested inside `<div ref={calendarScrollRef} className="flex-1 overflow-x-auto">`. Vertical scrolling may occur elsewhere (likely the parent `main`). Need a dedicated vertical scroll container around the time grid so sticky positioning can work.

## Hypothesis
1. Sticky fails because the scroll container is `main` (from `DashboardLayout`) while the sticky row is inside a child that doesn’t cover the full height. Sticky elements must be direct descendants of the scroll container.
2. `overflow` styles on intermediate wrappers (`overflow-hidden`, `overflow-x-auto`) break sticky by creating new stacking contexts or clipping.
3. `top` offsets need to account for both the topbar (64px) and calendar primary toolbar (56px). Without consistent positioning, the staff row will be hidden beneath the topbar when it sticks.

## Proposed Refactor Plan
1. Create a dedicated calendar shell that sets `height: calc(100vh - topbarHeight)` and makes the main calendar area scroll vertically inside this container (`overflow-y: auto`).
2. Ensure the sticky staff header is a direct child of that scroll container. Remove conflicting `overflow` declarations between the sticky element and parent.
3. Replace magic numbers (`top-16`) with CSS variables or calculated offsets derived from toolbar heights.
4. Extract toolbar(s) into separate components with consistent heights so `top` offsets remain predictable across views.
5. After structural changes, verify that drag-and-drop and scroll performance remain unaffected (needs revisit once layout is reworked).

## Next Steps
- [x] Refactor calendar layout wrapper to define scroll container and sticky offsets.
- [x] Adjust `DailyView` grid structure to keep staff header as a direct child of scroll container.
- [x] Update `WeeklyView` and `MonthlyView` to share the same layout contracts.
- [x] Re-run merchant app locally and visually confirm sticky header behaviour.

## Implementation Notes (September 27, 2025)
- Added dynamic CSS variables (`--calendar-topbar-offset`, `--calendar-sticky-offset`) so toolbar heights are measured at runtime. These values are written onto the calendar root via refs and a `useLayoutEffect` resize observer replacement.
- Converted the filters toolbar to a sticky container that respects the computed top offset, ensuring the staff header has a stable scroll parent.
- Wrapped the calendar content in `flex` containers with `min-h-0` and applied `maxHeight: calc(100vh - offset)` to each view’s scroll region. This keeps vertical scrolling inside the calendar shell instead of `DashboardLayout`’s `main` element.
- Updated `DailyView`, `WeeklyView`, and `MonthlyView` to share the same sticky offset and scroll constraints. The staff header row in `DailyView` is now sticky relative to the internal scroll container rather than the window.
- Verified in local browser session: staff header now remains pinned to the top while scrolling through time slots across day and week views, filters toolbar holds its position, and drag interactions still function.

This document captures current progress; implementation work is still pending.
