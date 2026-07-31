# Match Call-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated team owner create, review, and transactionally replace the official player selection for a scheduled match while preserving historical squads.

**Architecture:** A call-up remains a relational `callups` row joining one owned match to one same-team player. A PostgreSQL RPC performs the complete validated replacement in one transaction; server actions derive the team from `getTeamAccess`, while RLS, composite foreign keys, and lifecycle triggers remain the final authorization and integrity boundary. The route loads the match, its existing call-up, and the team roster in bounded queries, then a mobile-first client editor handles search, filters, bulk selection, and read-only history.

**Tech Stack:** Next.js App Router, React 19, TypeScript, next-intl, Zod, Supabase/PostgreSQL, pgTAP, Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- Call-ups are editable only for `scheduled` matches; completed and cancelled matches are read-only.
- Only active same-team players may be newly selected. Existing selected players remain historically valid after a later status change and can be retained or cleared.
- Never trust browser-submitted `team_id` or `owner_id`; use `getTeamAccess` and RLS.
- Preserve unique `(match_id, player_id)` and the existing relational player reference; do not duplicate player names.
- No maximum squad size is enforced because MVP.md defines none.
- Do not implement starting XI, captain, bench, substitutions, events, goals, cards, attendance, ratings, minutes, or statistics.

---

### Task 1: Call-up lifecycle and transactional database boundary

**Files:**

- Create: `supabase/migrations/20260730060000_callup_management.sql`
- Create: `supabase/tests/database/callup_management.test.sql`
- Modify: `supabase/tests/database/rls_policies.test.sql`
- Modify: `tests/security/callups.rls.test.ts`
- Modify: `types/database.ts` (generated)

**Interfaces:**

- Produces: `public.replace_match_callup(target_match_id uuid, selected_player_ids uuid[]) returns setof public.callups`.
- Enforces: scheduled-match mutation, immutable call-up identity, active-player additions, duplicate rejection, and atomic replacement.

- [ ] Write pgTAP and Supabase JS failures for completed/cancelled mutation, duplicate/foreign/inactive selection, immutable identity, atomic rollback, empty replacement, and retained historical inactive selections.
- [ ] Run the focused database/security tests and confirm the new assertions fail because the lifecycle/RPC does not exist.
- [ ] Add the trigger, scheduled-only RLS policies, and security-invoker replacement RPC with fixed search path and authenticated-only execution.
- [ ] Reset the local database, regenerate types, and rerun the focused security tests until green.

### Task 2: Call-up domain and validation

**Files:**

- Create: `features/callups/model.ts`
- Create: `features/callups/model.test.ts`
- Create: `features/callups/schemas.ts`
- Create: `features/callups/schemas.test.ts`
- Create: `features/callups/state.ts`

**Interfaces:**

- Produces: typed call-up match/player/view models, player grouping/sorting/filtering helpers, selection helpers, and `callupSelectionSchema`.
- Consumes: database player statuses and positions.

- [ ] Write failing tests for GK/DEF/MID/FWD ordering, number/name tie-breakers, name/number search, position/status/selected filters, select-all-active, clear-selection, UUID validation, and duplicate rejection.
- [ ] Run the focused tests and confirm expected missing-module/behavior failures.
- [ ] Implement only the tested model and validation behavior.
- [ ] Rerun focused tests and refactor while green.

### Task 3: Bounded reads and secure save action

**Files:**

- Create: `features/callups/data.ts`
- Create: `features/callups/data.test.ts`
- Create: `features/callups/actions.ts`
- Create: `features/callups/actions.test.ts`

**Interfaces:**

- Produces: `getCallupData(matchId)`, `saveCallupAction(locale, matchId, previousState, formData)`.
- Consumes: `getTeamAccess`, call-up schemas/models, and `replace_match_callup` RPC.

- [ ] Write failing tests proving invalid IDs short-circuit, match/team ownership is scoped, roster and selections are loaded without N+1 queries, foreign/inactive additions fail, existing unavailable selections may be retained, and the RPC receives only validated player IDs.
- [ ] Run the focused tests and verify RED.
- [ ] Implement the bounded data loader and server action with localized errors, revalidation, and success redirect.
- [ ] Rerun focused tests and refactor while green.

### Task 4: Call-up route and mobile-first editor

**Files:**

- Create: `app/[locale]/(dashboard)/matches/[matchId]/call-up/page.tsx`
- Create: `features/callups/callup-editor.tsx`
- Create: `features/callups/callup-editor.test.tsx`
- Modify: `app/[locale]/(dashboard)/matches/[matchId]/page.tsx`
- Modify: `messages/en.json`
- Modify: `messages/es.json`

**Interfaces:**

- Consumes: `getCallupData`, `saveCallupAction`, call-up view models.
- Produces: scheduled editor and completed/cancelled read-only call-up detail.

- [ ] Write failing UI tests for selected groups/count/last-updated, unavailable reasons, empty states, search/filter composition, select-all-active, clear selection, read-only history, and no lineup/captain controls.
- [ ] Run focused UI tests and verify RED.
- [ ] Implement the accessible responsive editor, hidden retained selections, bulk controls, feedback, and match-detail Manage/View Call-up action.
- [ ] Rerun focused UI tests and refactor while green.

### Task 5: Dashboard readiness integration

**Files:**

- Modify: `features/dashboard/model.ts`
- Modify: `features/dashboard/data.ts`
- Modify: `features/dashboard/progress.ts`
- Modify: `features/dashboard/progress.test.ts`
- Modify: `features/dashboard/dashboard-experience.tsx`
- Modify: `features/dashboard/dashboard-experience.test.tsx`
- Modify: `messages/en.json`
- Modify: `messages/es.json`

**Interfaces:**

- Adds: upcoming match `callup_count` and ready/incomplete presentation linking to the call-up route.

- [ ] Write failing tests showing Task 010 availability, the setup CTA targeting the nearest upcoming match, and upcoming cards rendering call-up ready/incomplete from real rows.
- [ ] Run dashboard tests and verify RED.
- [ ] Add the bounded readiness query and localized dashboard presentation.
- [ ] Rerun dashboard tests and refactor while green.

### Task 6: Documentation and full verification

**Files:**

- Create: `docs/callups.md`
- Modify: `README.md`
- Modify: `docs/database.md`
- Modify: `docs/security.md`
- Modify: `docs/security-testing.md`
- Modify: `docs/first-time-experience.md`
- Modify: `docs/matches.md`

**Interfaces:**

- Documents: ownership, eligibility, transaction strategy, historical snapshots, read-only history, no squad maximum, and Tasks 011–013 reuse.

- [ ] Document the implemented contract and deferred scope without claiming lineup or confirmation workflows.
- [ ] Run call-up, dashboard, match, player, season, security, and full test suites.
- [ ] Run formatting, lint, type checking, and the production build.
- [ ] Verify 375, 390, 430, 768, and desktop layouts; check keyboard labels, bulk actions, read-only state, browser errors, and horizontal overflow.
- [ ] Inspect `git diff --check`, the complete diff, and confirm no deferred football features were added.
