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

Player fields currently include total call-ups, completed-match call-ups,
goals, scoring matches, multi-goal matches, yellow cards, red cards, and the
team result context for completed matches in which the player was called up.
The player projection includes active and inactive roster rows so historical
leaders do not disappear when a player leaves the active roster. A call-up is
not an appearance: the current schema has no authoritative appearance event,
so the UI uses “called up” language everywhere.

Team fields include matches played, wins, draws/losses, goals
scored/conceded, goal difference, and cards. Minutes, starts, appearances,
assists, xG, heatmaps, ratings, and opponent-player workflows are intentionally
outside this task.

## Query composition

The RPC builds one bounded completed-match CTE and derives independent call-up,
goal-per-match, goal, and card aggregates before joining them to the roster.
That separation prevents a player with two goals and one card in one match from
inflating call-up or card totals through join multiplication. It is called once
per page view. The dashboard calls it in parallel with its independent bounded
reads, after the single active-season lookup, then selects leaders from the
returned rows in memory.

Season pages fetch at most 100 season rows and pass the resolved season to the
projection. Player detail uses the same season resolution and calls
`get_player_statistics_detail(uuid, uuid, uuid)`, which returns the player
summary plus bounded recent called-up matches, goal history, and discipline
history. This keeps the API reusable while preserving a small query surface.

Leaderboards are deterministic: goals, yellow cards, and red cards are ranked
separately with stable name and UUID tie-breakers. Zero-goal players are omitted
from top scorers; inactive players remain eligible for historical results.

## Security and freshness

The function is `SECURITY INVOKER`, checks that the requested team belongs to
`auth.uid()`, and checks that a requested season belongs to that team. Execute
is granted to `authenticated` and revoked from `public` and `anon`; no
service-role client is used by the application. The player-detail function
applies the same owner check and rejects a player outside the current team.
RLS remains active for every underlying table.

Because totals are never persisted, correcting a completed score or normalized
event automatically changes the next projection. There is no cache table,
counter trigger, or duplicated total to reconcile.

## Indexes and tests

The projection uses the existing tenant/status and call-up indexes plus the
Task 014 indexes:

- `matches_team_season_status_idx`
- `match_events_team_match_type_idx`
- `match_events_team_match_player_idx`
- `match_events_player_type_match_idx`

The pgTAP suites in `supabase/tests/database/statistics_snapshot.test.sql` and
`supabase/tests/database/player_statistics.test.sql` cover season and career
filtering, score orientation, join-multiplication resistance, completed-only
events, inactive history, deterministic ranking, player detail history, and
cross-team rejection. Unit tests cover ranking, filter resolution, and
dashboard display behavior.
