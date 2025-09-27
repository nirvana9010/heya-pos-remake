# Calendar Sticky Header — Refactor Recommendations

**Date:** September 27, 2025

These recommendations consolidate the fixes discussed and formalize an implementation plan to make the **staff header row** reliably sticky in the merchant calendar. They are based on your prior investigation notes and layout findings. fileciteturn0file0

---

## TL;DR

- Use **one vertical scroll container** for the entire calendar shell.
- Make **every sticky element** (calendar toolbar + staff header) a **direct child** of that vertical scroll container.
- Put **horizontal scrolling** in a wrapper that **also contains the staff header**, so the header stays horizontally aligned with the grid.
- Replace magic offsets with **CSS variables** measured at runtime using `ResizeObserver`.
- Audit and remove ancestor **`overflow`**, **`transform`**, or **`contain`** rules that break sticky or stacking.
- Add a **z-index + background** to sticky elements so content won’t bleed through.
- If constraints prevent true CSS sticky, fall back to **JS pinning** with `IntersectionObserver` and scroll‑sync for horizontal alignment.

---

## Problem Summary

Current attempts to make the staff header sticky fail because sticky positioning is calculated **relative to the nearest scroll container**. With the layout using `DashboardLayout > main[overflow-y:auto]`, the calendar’s sticky header is **not a direct child of the scrolling element**, and intermediate wrappers with `overflow-*`/flex sizing introduce clipping and stacking-context complications. Hard-coded offsets (`top-16`) drift as toolbar heights change across responsive breakpoints and feature flags. fileciteturn0file0

---

## Target Architecture

### Goals
1. Only **one vertical scroller** for calendar content.
2. Sticky items (calendar toolbar, staff header) are **direct children** of that scroller.
3. Staff header and time grid **scroll together horizontally**.
4. Offsets are **computed**, not hard-coded.

### DOM & Scroll Diagram (ASCII)

```
<body>
  <div.app min-h-screen flex-col>
    <Topbar class="sticky top-0 z-40" />  <-- sticks to window, not calendar

    <main class="flex-1 min-h-0 flex-col">  <-- no vertical overflow here
      <section#calendar-root style="height: calc(100vh - var(--topbar))" class="flex-col min-h-0">

        <div#calendar-vertical-scroll class="flex-1 min-h-0 flex-col overflow-y-auto">
          <!-- Sticky block 1: calendar toolbar -->
          <div#calendar-toolbar class="sticky top-0 z-30 bg-bg">
            <CalendarToolbar/>
          </div>

          <!-- Sticky block 2: staff header inside the SAME vertical scroller -->
          <!-- Place the staff header INSIDE a horizontal scroller, so it scrolls horizontally with the grid -->
          <div#calendar-horizontal-scroller-header class="sticky z-20 bg-bg"
               style="top: var(--toolbar)">
            <div class="overflow-x-auto">
              <StaffHeader/>  <!-- aligns with grid columns -->
            </div>
          </div>

          <!-- Scrollable content; same horizontal scroller used for the grid -->
          <div#calendar-horizontal-scroller-grid class="flex-1 relative">
            <div id="gridScroller" class="h-full overflow-x-auto">
              <TimeGrid/>     <!-- wide grid; matches header columns -->
            </div>
          </div>
        </div>

      </section>
    </main>
  </div.app>
</body>
```

**Why this works**
- Vertical sticky is relative to `#calendar-vertical-scroll` (the only vertical scroller).
- Staff header is **inside a horizontal scroller**, so it moves horizontally with the grid.
- The header’s `top` equals the computed toolbar height via a CSS variable.

---

## Implementation

### 1) Normalize `DashboardLayout`

Remove vertical scrolling from `main`; let the calendar own vertical scroll.

```tsx
// DashboardLayout.tsx
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Topbar id="topbar" className="sticky top-0 z-40" />
      {/* No overflow-y here */}
      <main className="flex-1 min-h-0 flex flex-col">
        {children}
      </main>
    </div>
  );
}
```

### 2) Calendar shell & CSS variables

Compute offsets for the topbar, toolbar, and staff header at runtime. Use `ResizeObserver` to keep values correct if heights change.

```tsx
// CalendarPage.tsx
import { useLayoutEffect, useRef } from "react";

export default function CalendarPage() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const staffHeaderRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const setVars = () => {
      const topbar = document.getElementById("topbar")?.offsetHeight ?? 64;
      const toolbar = toolbarRef.current?.offsetHeight ?? 56;
      const staff = staffHeaderRef.current?.offsetHeight ?? 48;

      rootRef.current?.style.setProperty("--topbar", `${topbar}px`);
      rootRef.current?.style.setProperty("--toolbar", `${toolbar}px`);
      rootRef.current?.style.setProperty("--staff", `${staff}px`);
      // combined offset if you need it later:
      rootRef.current?.style.setProperty("--sticky-offset", `${toolbar}px`);
    };

    const ro = new ResizeObserver(() => setVars());
    setVars();

    const toObserve = [
      document.getElementById("topbar"),
      toolbarRef.current,
      staffHeaderRef.current,
      rootRef.current,
    ].filter(Boolean) as Element[];

    toObserve.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, []);

  return (
    <section
      ref={rootRef}
      className="min-h-0 flex flex-col"
      style={{
        height: "calc(100vh - var(--topbar))",
        // Optional: account for safe area
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div id="calendar-vertical-scroll" className="min-h-0 flex-1 flex flex-col overflow-y-auto">
        {/* Sticky toolbar */}
        <div
          ref={toolbarRef}
          id="calendar-toolbar"
          className="sticky top-0 z-30"
          style={{ background: "var(--color-bg, white)" }}
        >
          <CalendarToolbar />
        </div>

        {/* Sticky staff header inside a horizontal scroller */}
        <div
          ref={staffHeaderRef}
          className="sticky z-20"
          style={{
            top: "var(--toolbar)",
            background: "var(--color-bg, white)",
          }}
        >
          <div id="headerScroller" className="overflow-x-auto">
            <StaffHeader />
          </div>
        </div>

        {/* Grid area shares the same horizontal scroll behavior */}
        <div className="min-h-0 flex-1 relative">
          <div id="gridScroller" className="h-full overflow-x-auto">
            <TimeGrid />
          </div>
        </div>
      </div>
    </section>
  );
}
```

### 3) Horizontal scroll sync (if columns must stay perfectly aligned)

If the header and grid must scroll **in lockstep** horizontally, sync `scrollLeft` between the two scrollers. (Many browsers will align fine if both have identical widths/scrollbars; this ensures perfection.)

```tsx
// useScrollSync.ts
import { useEffect } from "react";

export function useScrollSync(headerEl: HTMLElement | null, gridEl: HTMLElement | null) {
  useEffect(() => {
    if (!headerEl || !gridEl) return;

    let isSyncing = false;
    const onGrid = () => {
      if (isSyncing) return;
      isSyncing = true;
      headerEl.scrollLeft = gridEl.scrollLeft;
      requestAnimationFrame(() => (isSyncing = false));
    };
    const onHeader = () => {
      if (isSyncing) return;
      isSyncing = true;
      gridEl.scrollLeft = headerEl.scrollLeft;
      requestAnimationFrame(() => (isSyncing = false));
    };

    gridEl.addEventListener("scroll", onGrid, { passive: true });
    headerEl.addEventListener("scroll", onHeader, { passive: true });
    return () => {
      gridEl.removeEventListener("scroll", onGrid);
      headerEl.removeEventListener("scroll", onHeader);
    };
  }, [headerEl, gridEl]);
}
```

```tsx
// CalendarPage.tsx (excerpt)
import { useEffect, useRef } from "react";
import { useScrollSync } from "./useScrollSync";

// ...
const headerScrollerRef = useRef<HTMLDivElement | null>(null);
const gridScrollerRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  useScrollSync(headerScrollerRef.current, gridScrollerRef.current);
}, []);

// In JSX:
<div ref={headerScrollerRef} id="headerScroller" className="overflow-x-auto">
  <StaffHeader />
</div>
<div className="min-h-0 flex-1 relative">
  <div ref={gridScrollerRef} id="gridScroller" className="h-full overflow-x-auto">
    <TimeGrid />
  </div>
</div>
```

### 4) Tailwind/Utility details

- Apply `min-h-0` to **every** flex ancestor of a scrolling area; otherwise children will expand and kill scrollability.
- Ensure sticky layers have `bg-*` classes (no transparency) and appropriate `z-*`:
  - Topbar: `z-40`
  - Calendar toolbar: `z-30`
  - Staff header: `z-20`
  - Grid content: default (below 20)
- Avoid on ancestors of sticky elements:
  - `overflow: hidden|clip` (unless you intend to clip)
  - `transform`, `filter`, `perspective` (creates containing blocks/stacking contexts)
  - `contain: paint/layout` (can break sticky in some browsers)

### 5) Safari considerations

- Prefer `overflow-y: auto` on the single vertical scroller, not multiple nested `overflow`.
- Avoid `overflow: clip`; use `hidden` if you must clip.
- Ensure the sticky element’s parent has **no** vertical overflow; the sticky reference for the *vertical* axis must be the ancestor with vertical scrolling.

---

## Fallback: JS pinning (when CSS sticky can’t be made to work)

1. Insert a **sentinel** element above the staff header.
2. Observe it with `IntersectionObserver` against the vertical scroller to toggle a `pinned` class.
3. In `pinned`, set the header to `position: fixed; top: calc(var(--topbar) + var(--toolbar)); left: 0; right: 0;` and give it width equal to the grid container.
4. Use the **horizontal scroll sync** hook above to keep header aligned with the grid.
5. Keep a `ResizeObserver` on the grid container to update the fixed header’s width and left offset when layouts change.

This approach is robust but adds JS complexity; prefer CSS sticky first.

---

## Do / Don’t

| Do | Don’t |
|---|---|
| Use one vertical scroller inside the calendar shell | Put `overflow-y:auto` on `main` **and** inner calendar containers |
| Make sticky elements direct children of the vertical scroller | Nest sticky items under wrappers with `overflow` or `transform` |
| Put staff header and grid inside a **shared** horizontal scroller (or sync them) | Let the grid scroll horizontally while the header stays static |
| Compute offsets via CSS variables with `ResizeObserver` | Hard-code `top-16` and hope it fits everywhere |
| Set explicit `z-index` + solid background on sticky layers | Allow events to bleed through transparent sticky bars |
| Add `min-h-0` on flex ancestors | Omit `min-h-0` and lose scrollability |

---

## Test Plan (Day/Week Views)

1. **Sticky on vertical scroll:** staff header remains pinned directly below the calendar toolbar.
2. **Horizontal alignment:** header columns stay aligned with grid columns while scrolling horizontally.
3. **Layering:** events do not overlap the header; header has solid background and higher `z-index`.
4. **Responsive heights:** changing toolbar height (filters expand/collapse) updates sticky offsets without code changes.
5. **Browser parity:** Chrome + Safari (latest) behave identically.
6. **DnD/virtualization:** drag interactions and virtualized rendering continue to work; no unexpected transforms applied to sticky ancestors.

---

## Migration Steps

1. Remove vertical overflow from `DashboardLayout`’s `<main>`.
2. Introduce `#calendar-vertical-scroll` and move calendar toolbar + staff header **inside** it.
3. Wrap **both** the header and grid in matching horizontal scrollers.
4. Add the offset/size `ResizeObserver` hook and write CSS variables onto the calendar root.
5. Add `min-h-0` to all flex ancestors in the calendar shell.
6. Verify z‑index/backgrounds and remove conflicting ancestor `overflow`/`transform`/`contain`.
7. (Optional) Add the scroll‑sync hook if needed for exact column alignment.
8. QA per the test plan and ship.

---

## Open Questions / Info Needed

- Exact markup and classes for the **staff header** and **grid columns** (to validate horizontal alignment).
- Any use of **`transform`** on calendar ancestors (panels, drawers, modals) that could create containing blocks.
- Which **DnD/virtualization library** is in play (e.g., `dnd-kit`, `react-window`) to check for known quirks.
- **Target browsers** and minimum versions.

---

## Acceptance Criteria

- Staff header stays pinned under the toolbar while vertical scrolling in **day and week** views.
- Header and grid stay aligned during **horizontal scrolling**.
- No visual bleedthrough; events never overlay the sticky header.
- Offsets update automatically when toolbar height changes.
- Parity verified in Chrome and Safari.

---

**Appendix: Why previous attempts failed**  
Sticky was applied to a node **not** directly under the actual vertical scroll container (`main[overflow-y:auto]`), and intermediate wrappers added `overflow` and stacking contexts. Offsets were magic numbers. Moving to a single vertical scroller with direct‑child sticky elements and computed offsets resolves these structural constraints. fileciteturn0file0
