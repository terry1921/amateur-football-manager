# Mobile UX & PWA quality pass

## Scope

Task 018 improves the mobile and installable experience across the existing
application without changing domain logic, database schema, authentication,
RLS policies, or statistics calculations. Existing server actions and data
queries remain the source of truth.

## Mobile architecture

- Desktop navigation remains the full horizontal application navigation at
  `lg` and above.
- At smaller widths the shell uses four primary destinations—Dashboard,
  Matches, Players, and Statistics—plus a More bottom sheet for Team, Seasons,
  Leaderboards, and Social media.
- The main content reserves space for the fixed navigation and accounts for
  `safe-area-inset-top` and `safe-area-inset-bottom`.
- Reusable form action rows use `.mobile-action-bar` below the small breakpoint,
  keeping save/submit actions reachable while the keyboard or a long form is
  open.
- Filter chip rows use `.mobile-chip-row` for horizontal touch scrolling; data
  tables that would otherwise force page-wide scrolling provide compact mobile
  cards first.

## Responsive audit

The shell and feature surfaces were reviewed for 320, 360, 375, 390, 414,
430, 768, 1024, and desktop widths. The pass covers:

- dashboard operational cards and progress states;
- players and player forms;
- matches, match forms, and cancel/delete confirmation dialogs;
- seasons and season forms;
- call-ups;
- result entry and event timeline forms;
- statistics, player statistics, and leaderboard rankings;
- social generator selectors, preview, and export controls;
- loading, empty, error, and retry states.

All interactive controls have a minimum 44px height through the shared shell
styles. Long content is constrained with `min-w-0`, truncation where
appropriate, and explicit mobile list/card layouts rather than relying on a
wide table viewport.

## PWA and offline shell

- `app/manifest.ts` provides the standalone manifest, theme colors, scope,
  portrait orientation, and maskable SVG icon.
- `public/sw.js` registers a production-only service worker. It precaches the
  offline shell, serves navigation requests from the network first with an
  offline fallback, and caches same-origin Next static assets.
- `public/offline.html` is a safe, read-only fallback. It does not attempt
  offline editing, result entry, background sync, or queued mutations.
- `components/install-app-button.tsx` exposes the native install prompt only
  when the browser provides `beforeinstallprompt`.

## Accessibility and motion

- Shared focus-visible outlines use the team pitch color and a consistent
  offset.
- The mobile More control exposes `aria-expanded` and `aria-controls`.
- Existing form labels and validation semantics are preserved.
- Dialog close buttons retain focus return behavior; on mobile the match
  confirmation dialog presents as a bottom sheet.
- Reduced-motion users receive near-zero animation and transition durations.
- Social preview images declare dimensions, lazy loading, and async decoding.

## Verification

The repository includes structural tests for:

- the primary/secondary mobile navigation and More sheet;
- conditional PWA install prompt behavior;
- manifest install settings;
- safe-area, touch-target, overflow, reduced-motion, and service-worker
  foundations.

Run the relevant checks with:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test -- --run
```

Interactive viewport and Lighthouse checks should be run against a reachable
production build on a physical phone or browser device before release. The
service worker is intentionally production-only so development remains easy
to debug.

## Explicit non-goals

This pass does not add offline editing, push notifications, background sync,
native mobile applications, widgets, wearables, new statistics, or changes to
the underlying data model.
