# Season management

Task 007 adds the complete first-season workflow for a team owner: create,
view, edit, activate, complete, and archive without deleting history.

## Lifecycle

Seasons use the existing `draft`, `active`, and `completed` statuses.

- New seasons are created as `draft`.
- Activating a draft calls `public.activate_season(uuid)`. The database
  transaction completes the previous active season before activating the
  selected one.
- "Archive" maps a draft to `completed`; it does not delete the row.
- Active seasons can be marked completed explicitly.
- Completed seasons cannot be reactivated or edited.
- A season with match history cannot have its name or dates changed.

Only one active season can exist per team. The partial unique index remains the
final concurrency guard, while the activation function provides the normal
atomic transition.

## Current season resolver

`features/seasons/current-season.ts` exports `resolveCurrentSeason`. It accepts
an authenticated Supabase server client and a trusted server-derived team ID,
then returns the team's active season or `null`. Dashboard season data already
uses this resolver. Future match, standings, statistics, call-up, dashboard,
and report features should reuse it instead of duplicating active-season
queries.

## Validation and integrity

- Name, start date, and end date are required by the application.
- Names are trimmed and limited to 80 characters.
- The end date cannot precede the start date.
- `seasons_team_name_unique_idx` rejects duplicate names for one team,
  case-insensitively and after trimming.
- The authenticated role has no season `DELETE` privilege or delete policy.
- `guard_season_history` makes ownership immutable, blocks completed-season
  changes, rejects invalid status transitions, and protects match-linked
  names/dates.
- The service role retains deletion access for controlled tenant cleanup and
  administration.

## Authorization model

The browser never supplies `team_id` or `owner_id`. Server actions resolve the
signed-in user's team through `getTeamAccess`, scope every query by that team,
and rely on Row Level Security as the database boundary. `activate_season` is a
`security invoker` function with an empty search path; it does not bypass RLS.
Anonymous execution is revoked.

## Routes

- `/{locale}/seasons` — ordered list, active-season summary, empty state, and
  lifecycle actions.
- `/{locale}/seasons/new` — season creation.
- `/{locale}/seasons/{seasonId}` — season details and read-only history.
- `/{locale}/seasons/{seasonId}/edit` — editing when historical integrity
  permits it.

The dashboard checklist links to season management and advances from database
facts immediately after the first successful creation.

## Verification

Automated coverage includes schema validation and normalization, status/date
ordering, the current-season resolver, dashboard progression, PostgreSQL
constraints and privileges, atomic activation, completed-history immutability,
and authenticated cross-tenant attempts through Supabase JS.
