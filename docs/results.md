# Match result and event entry

Task 012.5 extends result entry into a complete match record. The final score,
managed-team goals, yellow cards, and red cards are submitted together and
become immutable historical facts after completion.

## Normalized event source

Events remain rows in `match_events`, never JSON embedded in `matches` and
never copied into player or season totals. The supported event types are:

| Event type    | Required attribution                     |
| ------------- | ---------------------------------------- |
| `goal`        | Called-up managed-team player and minute |
| `yellow_card` | Called-up managed-team player and minute |
| `red_card`    | Called-up managed-team player and minute |

Minutes are required non-negative PostgreSQL integers. Events also retain
optional non-negative `stoppage_time` and up to 500 characters of plain-text
`notes`. The display formats these fields as `45'`, `45+2'`, `90'`, or `90+5'`.
Duplicate events at the same minute are valid; each event keeps its own
database UUID and creation order.

Only managed-team player events are recorded. Opponent goals are represented by
the opponent score because opponent players are not modeled in the MVP. Thus a
managed team winning 3–2 stores three `goal` rows and the match score supplies
the two goals conceded.

## Atomic completion boundary

The server action validates the score and event payload, resolves the match's
location, and calls the security-invoker PostgreSQL function
`complete_match_with_events`. That function runs as one database transaction:

```text
lock scheduled match
  -> verify owner and call-up membership
  -> validate event types, UUIDs, minutes, added time, notes, and payload size
  -> require goal-event count = managed-team score
  -> replace scheduled draft events
  -> set both scores and status = completed
  -> commit
```

Any failure rolls back the event replacement and match update together. A
second submission sees a non-scheduled match and cannot duplicate events.
The function returns only a small completion summary, not cross-tenant rows.

The score orientation remains team-first:

| Fixture location | `team_score` | `opponent_score` |
| ---------------- | ------------ | ---------------- |
| Home             | Home score   | Away score       |
| Away             | Away score   | Home score       |
| Neutral          | Home score   | Away score       |

The result label is derived from these stored scores. It is not persisted.

## Integrity boundaries

- PostgreSQL enforces event type, required minute, non-negative minute, same-team
  match/player relationships, and membership in the match call-up through a
  composite foreign key. The RPC enforces score-to-goal reconciliation,
  ownership, event payload shape, and atomic replacement.
- RLS authorizes event access through the referenced match and only permits
  direct event writes while that match is scheduled. It also prevents foreign
  matches, teams, and players from being used through the Data API.
- The server action validates UUIDs, scores, event types, player IDs, minutes,
  and user-facing error mapping before calling the RPC. The UI is helpful but
  is not the integrity boundary.

## Call-up and history rules

Player status at result time does not matter: a player selected in the
historical call-up remains selectable even if their current status later becomes
injured, suspended, or inactive. A player not selected in that match cannot
receive an event. A 0–0 result may be completed without events; any positive
managed-team score requires one attributed goal row per goal.

Scheduled events may be edited or removed before completion. Completed and
cancelled matches are read-only, and completed event rows cannot be updated or
deleted through normal application access. Cancellation is blocked when draft
events already exist so the database cannot retain a cancelled fixture with
unresolved player history.

## UI and dashboard integration

The result form presents final score and a shared chronological timeline editor
for team goals, yellow cards, and red cards. Event rows are drafted locally with
stable client IDs and are submitted once. The submit button is disabled while
the request is pending or when goal reconciliation fails. Completed match
detail renders the same read-only timeline, with client-side type filters,
player search, and a derived goals/cards summary. Completed and cancelled
matches do not expose editable historical event controls.

On success, the localized dashboard, matches list, match detail, result route,
and season pages are revalidated. Recent result, next fixture, attention items,
primary action, and setup progress continue to derive from authoritative match
rows. No player totals, season totals, standings, or statistics dashboards are
introduced here.

## Future statistics contract

Tasks 014 and 015 derive, rather than persist, statistics from completed match
rows joined to `match_events`:

- goals: `type = 'goal'`
- yellow cards: `type = 'yellow_card'`
- red cards: `type = 'red_card'`
- goals for and against: completed match score columns
- season scope: `match_events -> matches -> seasons`

The existing `(match_id, type)`, `(player_id, type)`, and tenant event indexes
support these reads without adding speculative aggregate tables or indexes.
