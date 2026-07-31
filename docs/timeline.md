# Match timeline

Task 013 makes the normalized `match_events` rows the team’s match timeline.
The timeline is shared by the scheduled result form, completed match detail,
the result route, and the dashboard’s recent-result summary.

## Supported events

Only these managed-team event types are supported:

- `goal`
- `yellow_card`
- `red_card`

Every event belongs to a called-up player. Goals are reconciled atomically with
the managed team’s final score. Opponent events are outside the MVP scope.

## Ordering and display

`features/timeline/model.ts` owns the pure timeline rules:

- `getMatchTimeline` and `sortEvents` order by minute, stoppage time, creation
  timestamp, and row ID/client ID as a stable final tie-breaker.
- `formatFootballMinute` renders football notation such as `45'`, `45+2'`,
  `90'`, and `90+5'`.
- `getEventIcon` is the central icon mapping for goals and cards.
- `getGroupedEvents`, `getTimelineSummary`, and `filterTimelineEvents` derive
  grouped counts, player counts, type filters, and player search without
  changing the chronological list.

The UI displays each event’s icon, minute, player, shirt number when available,
and optional notes. The summary is derived from the event rows; it is not a
stored statistics table.

## Lifecycle

Before completion, the result form can add, edit, and remove player, minute,
stoppage time, and notes. The server sends all rows to
`complete_match_with_events`, which validates the payload, replaces the draft
event set, reconciles goals, and completes the match in one transaction.

After completion, the database trigger and RLS make event rows read-only. The
timeline is rendered in chronological order with client-side filters and
player search. No event editing controls are exposed.

## Query boundaries

Match detail reads its match, season, call-up, and bounded event set in parallel,
then resolves player display data once. Dashboard data reads at most one recent
match event set (250 rows) and derives its compact summary through timeline
helpers. Dashboard components do not query `match_events` directly.

The event types intentionally exclude assists, substitutions, lineups, VAR,
live updates, push notifications, opponent players, and speculative aggregate
statistics. Tasks 014 and 015 can derive future reports from these normalized
rows.
