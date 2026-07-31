# Statistics engine

Task 014 treats statistics as a derived projection, not stored team or player
totals. The source of truth is:

```text
completed matches + match scores + call-ups + normalized match_events
                              |
                              v
               get_statistics_snapshot(team, season?)
```

## Projection contract

`public.get_statistics_snapshot(uuid, uuid)` returns one JSON projection with
team totals and one row for every player on the team. The optional season UUID
selects a season; `null` produces career totals. The application resolves the
active season once and passes that same selection to the page and dashboard.

Only matches with `status = completed` and both managed-team and opponent
scores are included. Scheduled and cancelled fixtures are ignored. Match
scores are already stored in managed-team orientation, so the projection
compares `team_score` and `opponent_score` directly, matching the
`getMatchResult` convention used by the UI.

Player fields currently include goals, yellow cards, red cards, matches called
up, and wins/draws/losses. Team fields include matches played, wins/draws/
losses, goals scored/conceded, goal difference, and cards. Minutes, starts,
assists, xG, heatmaps, and opponent-player workflows are intentionally outside
this task.

## Query composition

The RPC builds one bounded completed-match CTE, then derives team aggregates,
event aggregates, and player rows from it. It is called once per page view. The
dashboard calls it in parallel with its independent bounded reads, after the
single active-season lookup. The dashboard then selects the top scorer and
discipline leader from the returned player rows in memory; it does not issue a
query per card or player.

Season pages fetch at most 100 season rows and pass the resolved season to the
projection. Player detail reuses the career projection and selects that player
locally. This keeps the API reusable while preserving a small query surface.

## Security and freshness

The function is `SECURITY INVOKER`, checks that the requested team belongs to
`auth.uid()`, and checks that a requested season belongs to that team. Execute
is granted to `authenticated` and revoked from `public` and `anon`; no
service-role client is used by the application. RLS remains active for every
underlying table.

Because totals are never persisted, correcting a completed score or normalized
event automatically changes the next projection. There is no cache table,
counter trigger, or duplicated total to reconcile.

## Indexes and tests

The projection uses the existing tenant/status and call-up indexes plus the
Task 014 indexes:

- `matches_team_season_status_idx`
- `match_events_team_match_type_idx`
- `match_events_team_match_player_idx`

The pgTAP suite in
`supabase/tests/database/statistics_snapshot.test.sql` covers season and
career filtering, score orientation, goals, cards, player results, empty
history behavior, and rejection of a foreign team. Unit tests cover ranking,
filter resolution, and dashboard display behavior.
