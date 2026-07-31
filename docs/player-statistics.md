# Player statistics

Task 015 is the player-facing specialization of the Task 014 statistics
projection. It is derived at read time from completed matches, call-ups, and
normalized `match_events`; no player totals are stored on `players` or in a
statistics table.

## Metric dictionary

| Metric                      | Definition                                                                     |
| --------------------------- | ------------------------------------------------------------------------------ |
| Total matches called up     | Distinct non-cancelled fixtures with a call-up row                             |
| Completed matches called up | Distinct completed fixtures with a call-up row                                 |
| Wins/draws/losses           | Completed-match result context for those completed call-ups                    |
| Goals                       | Normalized `goal` events in completed fixtures                                 |
| Scoring matches             | Distinct completed fixtures containing one or more goal events for the player  |
| Multi-goal matches          | Distinct completed fixtures containing at least two goal events for the player |
| Yellow/red cards            | Normalized card events in completed fixtures                                   |

The schema does not yet record appearances, starts, minutes, assists, ratings,
clean sheets, or substitutions. A call-up is therefore never presented as an
appearance or “matches played.”

## Scopes and rankings

The page supports the active season, a specific season, and team career. Career
means the current team’s full history, not a cross-team player career. Completed
matches are the only source for events and result context; scheduled and
cancelled fixtures are excluded. Active and inactive players are both included
in the projection. Top scorers omit zero-goal rows, while yellow-card and
red-card leaders are separate rankings. Ties use stable name and UUID
tie-breakers so the result does not depend on database row order.

## Player detail

`/players/[playerId]` keeps the roster identity and adds the selected-scope
summary, result context, recent completed called-up fixtures, goal history, and
discipline history. History rows link back to the fixture and show the managed
team’s score orientation. The detail RPC bounds recent matches to 10 rows and
each event history to 50 rows.

## Query and security contract

`get_statistics_snapshot(team, season?)` computes independent call-up,
goal-per-match, goal, and card aggregates before joining them to player rows.
This avoids the classic multiplication bug where multiple events in one match
inflate participation or discipline totals. The dashboard reuses the same
snapshot and selects its top scorer and card leaders in memory.

Both statistics RPCs are `SECURITY INVOKER`, require the authenticated owner’s
team, validate the requested season, and reject a player outside that team.
They run through the cookie-backed authenticated client; no service-role read
is used.

The future participation model should add an authoritative appearance event or
lineup status. Once that exists, it can be introduced as a new derived metric
without relabelling today’s call-up counts.
