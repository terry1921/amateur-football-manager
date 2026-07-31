# Match CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver secure, mobile-first fixture scheduling and management for authenticated team owners, including list/detail/create/edit/cancel/safe-delete flows and dashboard integration.

**Architecture:** Add a focused `features/matches` boundary that follows the existing season/player patterns: server-side team resolution and Supabase queries, Zod validation, small pure domain helpers, Server Actions for mutations, and client components only for filters, forms, and confirmation dialogs. PostgreSQL remains the invariant and authorization boundary through the existing composite team/season foreign key, tightened score/history constraints, and lifecycle-aware RLS.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, next-intl, Zod 4, Supabase/PostgreSQL RLS, Tailwind CSS, Vitest, Testing Library, pgTAP.

## Global Constraints

- Read and preserve `MVP.md` as the product source of truth.
- New matches are `scheduled` with null scores; Task 009 never exposes result entry.
- A match may reference only a season belonging to the same team.
- Only `draft` and `active` seasons accept newly scheduled fixtures.
- Standard fixture edits apply only to `scheduled` matches.
- Cancellation is `scheduled → cancelled`; restoration is deferred.
- Hard deletion is limited to scheduled/cancelled matches without call-ups or events.
- Completed records and dependent football history cannot be hard-deleted.
- Input date/time is interpreted in the browser's IANA timezone, stored as UTC `timestamptz`, and displayed in the viewer's timezone.
- Do not implement call-ups, lineups, events, result entry, statistics, standings, or social generation.
- Preserve English and Spanish interfaces, mobile usability, and RLS tenant isolation.

---

### Task 1: Database invariants and security boundary

**Files:**

- Create: `supabase/migrations/20260730_match_management_invariants.sql`
- Create: `supabase/tests/database/match_management.test.sql`
- Modify: `supabase/tests/database/initial_schema.test.sql`
- Modify: `supabase/tests/database/rls_policies.test.sql`
- Modify: `tests/security/matches.rls.test.ts`
- Modify: `types/database.ts` through generated types only if schema metadata changes

**Interfaces:**

- Consumes: existing `matches(team_id, season_id)` composite foreign key and owner-scoped RLS.
- Produces: database-enforced score lifecycle, immutable team identity/history rules, and eligible-delete policy used by application actions.

- [ ] **Step 1: Add failing pgTAP cases**

Add assertions that scheduled/cancelled scores are rejected, completed scores are required and nonnegative, invalid status/location and cross-team seasons fail, completed/cancelled history cannot be edited, and matches with call-ups/events or completed results cannot be deleted.

- [ ] **Step 2: Run the database tests to verify the new cases fail**

Run: `npm run test:security`

Expected: match-management assertions fail against the current permissive score/delete behavior.

- [ ] **Step 3: Add the migration**

Replace the current score-state check with the exact invariant:

```sql
check (
  (status in ('scheduled', 'cancelled') and team_score is null and opponent_score is null)
  or
  (status = 'completed' and team_score is not null and opponent_score is not null)
)
```

Add a match-history trigger that makes `team_id` immutable, makes completed/cancelled rows immutable, and permits only `scheduled → cancelled` or future-compatible `scheduled → completed` status transitions. Replace the match delete policy so authenticated owners can delete only scheduled/cancelled rows with no `callups` or `match_events`.

- [ ] **Step 4: Extend client-level RLS regression coverage**

Prove own scheduled insert/update/cancel/eligible-delete, foreign UUID denial, foreign-season denial, cross-team movement denial, dependent-history deletion denial, completed deletion denial, and anonymous denial without using the setup client for assertions.

- [ ] **Step 5: Re-run database and security tests**

Run: `npm run test:security`

Expected: all pgTAP and Supabase JS authorization/constraint tests pass.

### Task 2: Match domain, validation, and timezone conversion

**Files:**

- Create: `features/matches/model.ts`
- Create: `features/matches/model.test.ts`
- Create: `features/matches/schemas.ts`
- Create: `features/matches/schemas.test.ts`
- Create: `features/matches/time.ts`
- Create: `features/matches/time.test.ts`
- Create: `features/matches/state.ts`

**Interfaces:**

- Produces: `Match`, `MatchStatus`, `MatchLocation`, `MatchGroup`, `isEligibleSeason`, `groupMatches`, `filterMatches`, `canEditMatch`, `canDeleteMatch`, `matchSchema`, `wallTimeToUtc`, and `utcToFormValues`.

- [ ] **Step 1: Write failing pure-domain tests**

Cover labels/allowed enums, eligible season states, deterministic ordering, upcoming/past-unresolved/completed/cancelled classification, search by opponent/venue, composed filters, edit/delete rules, and managed-team score orientation.

- [ ] **Step 2: Write failing validation and timezone tests**

Cover empty/whitespace/overlong opponent, missing/foreign/completed season at action level, invalid location/date/time/timezone, optional venue/notes normalization and length limits, valid past kickoff, DST-aware UTC conversion, and UTC-to-local edit defaults.

- [ ] **Step 3: Implement the minimal pure helpers and schemas**

Use schema-supported fields only: `season_id`, `opponent_name`, `kickoff_at`, `home_away`, `venue`, `notes`, `status`, `team_score`, and `opponent_score`. Competition, round, and opponent logo remain outside Task 009 forms.

- [ ] **Step 4: Run focused unit tests**

Run: `npx vitest run features/matches/model.test.ts features/matches/schemas.test.ts features/matches/time.test.ts`

Expected: all focused tests pass.

### Task 3: Authenticated match data and mutation operations

**Files:**

- Create: `features/matches/data.ts`
- Create: `features/matches/actions.ts`
- Create: `features/matches/actions.test.ts`

**Interfaces:**

- Consumes: `getTeamAccess`, `resolveCurrentSeason`, match domain/schema/time helpers, authenticated Supabase server client.
- Produces: `getMatchesData`, `getMatchDetails`, `getMatchFormData`, `createMatchAction`, `updateMatchAction`, `cancelMatchAction`, and `deleteMatchAction`.

- [ ] **Step 1: Add failing action/data tests with typed Supabase doubles**

Assert server-derived `team_id`, owned eligible-season verification, active-season preselection, scheduled/null-score creation, completed/cancelled edit rejection, cancellation retaining null scores, eligible delete checks, safe not-found behavior, and foreign-season rejection.

- [ ] **Step 2: Implement bounded match queries**

Select explicit columns, fetch seasons once, join season labels without per-row queries, cap all-history results at a documented MVP limit, and order with stable kickoff/created/id tie-breakers.

- [ ] **Step 3: Implement secure Server Actions**

Resolve the current team server-side; never accept ownership fields; re-query the selected season with `team_id` and `status in (draft, active)`; set `status: 'scheduled'` and both scores to `null`; scope every mutation by team/id/current status; revalidate matches, dashboard, and relevant season pages.

- [ ] **Step 4: Run focused action/data tests**

Run: `npx vitest run features/matches`

Expected: domain, validation, timezone, and server-operation tests pass.

### Task 4: Match routes, forms, filters, details, and confirmations

**Files:**

- Replace: `app/[locale]/(dashboard)/matches/page.tsx`
- Create: `app/[locale]/(dashboard)/matches/new/page.tsx`
- Create: `app/[locale]/(dashboard)/matches/[matchId]/page.tsx`
- Create: `app/[locale]/(dashboard)/matches/[matchId]/edit/page.tsx`
- Create: `app/[locale]/(dashboard)/matches/loading.tsx`
- Create: `app/[locale]/(dashboard)/matches/error.tsx`
- Create: `features/matches/match-form.tsx`
- Create: `features/matches/match-management.tsx`
- Create: `features/matches/match-actions.tsx`
- Create: `features/matches/match-management.test.tsx`
- Modify: `messages/en.json`
- Modify: `messages/es.json`

**Interfaces:**

- Consumes: Task 2 helpers and Task 3 operations.
- Produces: canonical `/matches`, `/matches/new`, `/matches/[id]`, and `/matches/[id]/edit` UX.

- [ ] **Step 1: Add failing component tests**

Cover the no-season CTA, no-match empty state, filtered-empty reset, no fake `0–0`, overdue scheduled labeling, completed score display, query-state filters, scheduled-only edit/cancel actions, confirmation copy, and disabled duplicate submissions.

- [ ] **Step 2: Build the accessible create/edit form**

Render season, opponent, date, time, location, venue, and notes controls with associated errors. Capture the browser IANA timezone before enabling submission. Preselect the active season, otherwise the sole eligible season.

- [ ] **Step 3: Build mobile-first grouped fixture management**

Client-filter the bounded tenant-scoped list by opponent/venue, season, status, location, and group while synchronizing `search`, `season`, `status`, and `location` query parameters. Render Upcoming, Past unresolved, Completed, and Cancelled groups with their documented order.

- [ ] **Step 4: Build detail/edit and confirmation actions**

Render all supported fields, completed scores only, notes as plain text, scheduled-only edit/cancel, and safe-delete for eligible rows. Use native modal dialogs with focus restoration and pending states.

- [ ] **Step 5: Add localized English/Spanish copy and route loading/error states**

Remove the Task 009 placeholder copy and ensure all visible status, location, form, feedback, filter, empty-state, and confirmation strings are localized.

- [ ] **Step 6: Run route/component tests**

Run: `npx vitest run features/matches app`

Expected: match component and route-adjacent tests pass.

### Task 5: Dashboard and first-time setup integration

**Files:**

- Modify: `features/dashboard/data.ts`
- Modify: `features/dashboard/model.ts`
- Modify: `features/dashboard/progress.ts`
- Modify: `features/dashboard/progress.test.ts`
- Modify: `features/dashboard/dashboard-experience.tsx`
- Modify: `features/dashboard/dashboard-experience.test.tsx`
- Modify: `messages/en.json`
- Modify: `messages/es.json`

**Interfaces:**

- Consumes: real scheduled/completed match records and existing current-season resolver.
- Produces: active match CTA, linked nearest upcoming fixture, recent valid result, and setup progression driven only by authoritative counts.

- [ ] **Step 1: Update failing dashboard tests**

Expect the match setup step to be available after an eligible season exists, the empty-state action to link to `/matches/new`, the first created match to advance to call-up, upcoming detail to link to its match, and valid completed scores to render without null fallback.

- [ ] **Step 2: Update dashboard queries and UI**

Keep nearest-upcoming and recent-result queries bounded to one row, add match IDs/location where needed, optionally add lightweight status counts, link real fixtures to detail, and remove the “Coming in Task 009” state.

- [ ] **Step 3: Run dashboard/setup tests**

Run: `npx vitest run features/dashboard tests/security/dashboard-progress.rls.test.ts`

Expected: setup and dashboard rendering tests pass; RLS integration remains part of the dedicated security command.

### Task 6: Documentation, regression verification, and final review

**Files:**

- Create: `docs/matches.md`
- Modify: `docs/database.md`
- Modify: `docs/security.md`
- Modify: `docs/first-time-experience.md`

**Interfaces:**

- Produces: contributor-facing match lifecycle, timezone, score orientation, deletion, dashboard, and future-integration contract.

- [ ] **Step 1: Document implementation decisions**

Record ownership, same-team season enforcement, field rules, lifecycle, eligible seasons, UTC storage/browser-zone input-display behavior, managed-team score columns, neutral convention, cancellation vs deletion, historical protections, dashboard behavior, bounded client filtering, and later call-up/result/event/statistics reuse.

- [ ] **Step 2: Apply/reset local Supabase and regenerate types**

Run: `npm run supabase:status`, `npx supabase db reset --local`, and `npm run db:types`.

Expected: migrations replay cleanly and generated types are formatted.

- [ ] **Step 3: Run all verification**

Run:

```text
npm run test:security
npm test
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run build
```

Expected: every command passes.

- [ ] **Step 4: Inspect responsive behavior and final diff**

Verify 375, 390, 430, 768, and desktop widths; create/edit/cancel/delete flows; a known timezone round trip; no fake score; no horizontal overflow; and no call-up/result/event/statistics feature accidentally added. Review `git diff --check`, `git status --short`, and the complete diff before completion.
