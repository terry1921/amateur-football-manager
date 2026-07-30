# Player management

Players belong directly to a team and are independent of seasons. The player
surface supports creation, viewing, editing, searching, filtering, and status
changes for the authenticated user's team.

## Fields and rules

| Field        | Required | Rule                                            |
| ------------ | -------- | ----------------------------------------------- |
| First name   | Yes      | Trimmed, non-empty, at most 80 characters       |
| Last name    | No       | Trimmed, at most 80 characters                  |
| Nickname     | No       | Trimmed, at most 80 characters                  |
| Shirt number | No       | Whole number from 0 through 99                  |
| Position     | Yes      | `GK`, `DEF`, `MID`, or `FWD`                    |
| Status       | Yes      | `active`, `injured`, `suspended`, or `inactive` |

The current database intentionally allows duplicate and unassigned shirt
numbers. This reflects amateur-team workflows where numbers may be temporary or
shared. If that product rule changes later, uniqueness must be introduced by a
reviewed migration rather than assumed in the UI.

## Availability and history

`active` means available. `injured`, `suspended`, and `inactive` are counted as
unavailable. The default “Current squad” view shows active, injured, and
suspended players; inactive players remain discoverable through the status
filter and can be reactivated.

The application provides no player delete action. Authenticated database access
also has no `DELETE` privilege or policy for `players`, and `team_id` cannot be
changed after creation. Existing composite foreign keys use deferred `NO ACTION`
for call-ups and match events as an additional history safeguard.

**Never delete a player in a way that removes or invalidates historical match records.**

## Search and sorting

The roster is loaded only for the current team and filtered client-side. Search
is trimmed, case-insensitive, accent-insensitive, and matches display name,
nickname, or shirt-number text. Position and status filters compose with search.
The default order is status availability, position (`GK`, `DEF`, `MID`, `FWD`),
shirt number, then name.

Client-side filtering is appropriate for the expected amateur squad size and
keeps interactions immediate. If roster sizes grow substantially, preserve the
same filter semantics while moving search, ordering, and pagination to indexed
server queries.

## Security boundary

Server actions derive the team from the authenticated session via
`getTeamAccess`; browser-submitted `team_id` and owner fields are ignored. Every
read and mutation also includes the current `team_id`, while RLS remains the
authoritative cross-tenant boundary. No service-role client is used by player
pages or actions.
