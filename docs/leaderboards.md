# Leaderboards

Task 016 is the presentation layer for competitive rankings. It consumes the
Task 014 statistics snapshot and the Task 015 player projection; it does not
run a second aggregation query, persist rankings, or persist awards.

```text
completed matches + normalized events
              ↓
      get_statistics_snapshot
              ↓
          leaderboards
              ↓
       dashboard and player detail
```

## Rankings

The module presents top scorers, yellow-card leaders, red-card leaders, and
most called-up players. The called-up ranking is explicitly based on completed
matches with a call-up row; it is not an appearance ranking because the current
schema does not contain an authoritative appearance event. Every row also shows
the team record while the player was called up as wins-draws-losses.

Zero-value rows are omitted from each ranking. Historical inactive players stay
eligible when the scope is career or when their status is included by the
filter.

## Sorting and ties

Rankings use competition ranking: `1, 2, 2, 4`. The primary sort is descending
for goals, cards, or completed called-ups. Player name ascending is the first
deterministic tie-breaker, followed by player UUID. Awards use the same stable
ordering plus only projection fields already available in Task 014/015.

## Awards

Awards are generated in memory for the selected scope:

- Golden Boot: the top scorer, only when at least one goal exists.
- Best Discipline: the most called-up player with no recorded card, with wins
  as the next tie-breaker.
- Iron Player: the most completed-match call-ups, with wins as the next
  tie-breaker.

These are view-level labels. A corrected match or event changes them on the
next read; no award row or badge is stored.

## Filters and navigation

The page supports current season, a specific season, and team career. Search,
position, and current/status filters reuse `resolvePlayerStatisticsFilters`
and `filterPlayerStatistics` from the shared statistics model. Selecting a
player links to the Task 015 player detail page with its own season selector.

The dashboard uses the same pure leaderboard helpers for its top scorer, most
called-up player, and discipline leader links. It does not issue one query per
ranking or player.

## Security and performance

The page reads through the authenticated server-side `getStatisticsData` path.
The underlying RPC remains security-invoker and owner-scoped, with RLS active
for the completed matches, call-ups, players, and normalized events. No
service-role client is used and no cross-team aggregate is exposed.

Each page scope performs one season-context lookup and one bounded statistics
snapshot RPC. All rankings, filters, ranks, and awards are computed from the
returned player projection in memory, so the module has no N+1 query pattern.

## Future expansion

Season awards history, a club hall of fame, records, and achievements can reuse
this presentation contract. They should continue consuming new shared
projections rather than adding aggregate logic to leaderboard components or
persisting derived rankings.
