# Match call-ups

Task 010 adds a match-specific squad-selection workflow. It chooses eligible
players for a scheduled fixture while preserving the relationships later
events, results, statistics, and content generation will use.

## Ownership and relational integrity

```text
Player -> Call-up -> Match -> Season -> Team -> Owner
```

The route accepts only a match UUID. Server reads and mutations resolve the
current owner through `getTeamAccess`, scope the match and roster to that team,
and remain subject to RLS. Neither `team_id` nor an owner identifier is trusted
from the browser.

Composite foreign keys guarantee that the selected player and referenced match
belong to the call-up's team. A unique `(match_id, player_id)` constraint keeps
one selection per player per match.

## Eligibility and historical selections

- Active players may be newly selected.
- Injured, suspended, and inactive players remain visible with their reason but
  have disabled selection controls.
- If a selected player later becomes unavailable, the saved selection remains
  visible and may be retained. This preserves what was known for that fixture.
- Clearing or explicitly removing a historical selection deletes that call-up;
  it cannot be re-added while the player remains unavailable.
- No maximum squad size is imposed in the MVP.

Search matches name, nickname, and shirt number without case or accent
sensitivity. Position, availability, and selection filters compose. “Select
all active” adds every active filtered roster member while retaining existing
historical selections; “Clear” removes the complete selection.

The database has `called_up`, `confirmed`, and `declined` call-up statuses.
Task 010 creates new selections as `called_up` and preserves an existing row's
status. Confirmation and decline interaction is outside this task.

## Lifecycle

Scheduled matches are editable. Completed and cancelled matches show the saved
call-up as read-only history; the UI, RLS policies, mutation function, and
database trigger all enforce that boundary.

Call-up identity (`team_id`, `match_id`, and `player_id`) cannot be changed in
place. A different selection is represented by removing one row and inserting
another through the replacement operation.

## Atomic replacement

`public.replace_match_callup(match_id, player_ids)` is a security-invoker RPC.
It locks the owned match, verifies that it is still scheduled, rejects duplicate
IDs, validates every player, and only then synchronizes additions and removals.
An invalid ID rolls back the whole call, leaving the previous squad unchanged.

The operation accepts only the match and player IDs. Team and owner identity are
derived from the authenticated database context. Anonymous execution is
revoked, and ordinary row policies apply because the function does not bypass
RLS.

## Product integration

The match detail page links to Manage call-up for scheduled fixtures and View
call-up for immutable fixtures. The upcoming-match dashboard card shows a ready
count when any players are selected and an incomplete prompt when none are.
This is a readiness hint, not lineup validation.

Task 011 can use the same call-up rows when associating match events with
eligible players. Result entry, participation-derived statistics, and content
generation must continue to reference the existing match, player, and call-up
records rather than copying their identity into parallel tables.

Lineups, formations, starters and substitutes, captaincy, minute allocation,
notifications, attendance confirmation, and player self-service are deferred.
