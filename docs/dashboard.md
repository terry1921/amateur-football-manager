# Operational dashboard

Task 011 extends the existing `/dashboard` route from the first-time setup
experience into the team's daily operational home. It keeps one server-side
view model and derives every visible value from the existing team, season,
player, match, and call-up rows.

## Data contract

| Field             | Source                 | Derivation                                                                      | Empty or failure behavior                                                   |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Team              | `getTeamAccess`        | Earliest owned team, the established current-team rule                          | Missing team remains a protected-route error                                |
| Active season     | `resolveCurrentSeason` | One `status = active` season                                                    | Team-level modules remain usable; season actions point to season management |
| Setup progress    | bounded head counts    | Existing `getTeamSetupProgress` rules                                           | Never inferred from failed reads                                            |
| Primary action    | dashboard model        | Dependency-aware decision order                                                 | One route and label are supplied to the header and quick actions            |
| Attention items   | dashboard model        | Centralized priority and deduplication                                          | At most five items                                                          |
| Squad summary     | player head counts     | `active` is available; injured, suspended, and inactive are unavailable         | Counts are tenant-scoped and never replaced with zero on error              |
| Next match        | `matches`              | Nearest scheduled fixture in the active season at/after `now`                   | Dependency-aware empty state                                                |
| Upcoming fixtures | `matches`              | Up to five future scheduled fixtures in the active season                       | Empty state links to season management or matches                           |
| Recent result     | `matches`              | Latest completed active-season match with both scores                           | No result state; no placeholder score                                       |
| Recent fixture    | `matches`              | Latest past scheduled/cancelled active-season fixture                           | Clearly labelled as unresolved or cancelled, never as a result              |
| Call-up readiness | `callups`              | One batched lookup for visible upcoming match IDs; one or more rows means ready | `not_started` for zero rows; historical matches are read-only               |

## Query strategy

After the authenticated team is resolved, the dashboard resolves the active
season once. It then runs the independent reads in one `Promise.all`:

- one season count;
- five player counts: total, active, injured, suspended, inactive;
- one match count and one call-up count;
- up to five upcoming fixtures;
- one past scheduled fixture;
- one latest completed result;
- one latest cancelled/past scheduled fixture.

The fixture reads are limited to five upcoming rows or one history row and use
the existing team/season/status/kickoff indexes. The call-up read is performed
after fixture IDs are known, is scoped to those IDs, and is capped at the
existing 250-player roster limit per visible fixture. This is the only
dependent read and prevents one call-up query per card.

No database view, RPC, or migration was added. The existing authenticated
Supabase client and RLS policies protect both records and aggregates. A SQL
function would add security and deployment surface without removing the need
for the batched call-up read at this MVP scale.

## Composition rules

- A call-up is ready when the scheduled match has at least one saved call-up
  row. No minimum squad size is invented.
- A past scheduled match is unresolved, not completed.
- Result labels use the existing managed-team score orientation helper.
- Primary action order is: create/activate season, add players, review a squad
  with no available players, schedule a match, prepare the next call-up, then
  open the next match.
- Attention order is: past unresolved match, missing next-match call-up, no
  available players, no upcoming match, no active season, then an empty squad.
  The list is capped at five items and only adds dependency-aware conditions.
- Setup progress remains authoritative and adaptive. It is compact only when
  the core setup exists and an active season is available.

## Freshness and security

The dashboard remains dynamic through the existing dashboard layout. Team,
season, player, match, and call-up mutations already revalidate the localized
dashboard path. Every read uses the cookie-backed server client, the current
team is resolved server-side, and no browser-provided `team_id` or `owner_id`
is accepted.

Statistics, standings, notifications, charts, calendar sync, and social
content remain deferred. Result entry and normalized match-event history are
now available from the match workflow. Future reporting can extend this view
model with authoritative derived fields rather than dashboard state records.
