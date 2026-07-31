# Match management

Task 009 adds fixture scheduling and lifecycle management. A match is the stable
parent that later call-ups, events, results, statistics, and content workflows
reuse.

## Ownership and season integrity

```text
Match
  -> Season
  -> Team
  -> Owner
```

Application reads and mutations use the authenticated Supabase server client
and resolve the current team through `getTeamAccess`. No match form accepts a
`team_id` or owner identifier.

The database enforces `(matches.team_id, matches.season_id) ->
seasons(team_id, id)` with a composite foreign key. A match therefore cannot
reference another team's season even if a user submits a real foreign UUID.
RLS independently limits match rows to the owner reached through
`matches.team_id -> teams.owner_id`.

## Supported fields

| Field    |         Required | Editable while scheduled | Rule                                                 |
| -------- | ---------------: | -----------------------: | ---------------------------------------------------- |
| Season   |              Yes |                      Yes | Owned `draft` or `active` season                     |
| Opponent |              Yes |                      Yes | Trimmed, 1–120 characters                            |
| Kickoff  |              Yes |                      Yes | Valid local date, time, and IANA timezone            |
| Location |              Yes |                      Yes | `home`, `away`, or `neutral`                         |
| Venue    |               No |                      Yes | Trimmed, at most 160 characters                      |
| Notes    |               No |                      Yes | Plain text, at most 2,000 characters                 |
| Status   | Database-managed |                       No | `scheduled`, `completed`, or `cancelled`             |
| Scores   |               No |                       No | Null for scheduled/cancelled; required for completed |

The schema also has `opponent_logo_url`, `competition`, and `round`, but Task
009 does not expose them because the scheduling workflow does not require
competition or opponent management.

## Status lifecycle

```text
scheduled -> cancelled    Task 009
scheduled -> completed    Task 012
```

New records are always `scheduled` with both scores explicitly null.
Completed and cancelled fixtures are immutable historical rows. The standard
fixture form edits scheduled records only; result entry is handled by the
separate match result transaction.

The database trigger allows the atomic transition from scheduled to completed
only when the score-state check also succeeds. It rejects unsupported
transitions and changes to completed/cancelled history.

> A scheduled match must never be represented as a completed 0–0 result.

## Score orientation

The implemented schema uses managed-team orientation rather than home/away
columns:

```text
team_score     = managed team's score
opponent_score = external opponent's score
```

Home and neutral fixtures store entered home as the managed team; away
fixtures reverse the entered scores before writing the team-first columns.

## Season selection

Only `draft` and `active` seasons accept scheduled fixtures. The create form
preselects the active season through the shared `resolveCurrentSeason`
resolver. If there is no active season and exactly one eligible season exists,
that season is selected. A season-specific create link can preselect an owned
eligible season through `?season=`.

The browser selection is not trusted. Every create/update action re-queries the
season using the server-derived team ID and eligible statuses. If no eligible
season exists, the scheduler is replaced with a link to season creation.

## Date, time, and timezone policy

- Input is a local calendar date and time plus the browser's IANA timezone from
  `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- The Server Action converts that wall time to an absolute UTC instant without
  relying on the server machine timezone.
- PostgreSQL stores the instant in the existing `kickoff_at timestamptz`
  column.
- Lists, details, dashboard cards, and confirmation copy render the stored
  instant using the viewer's locale and browser timezone.
- `Intl` timezone rules provide the applicable historical/DST offset.
  Nonexistent spring-forward times are rejected. An ambiguous fall-back time
  resolves deterministically to the earlier occurrence.

Automated tests cover Mexico City conversion, winter/summer New York offsets,
a nonexistent spring-forward time, invalid identifiers, and an edit-form
round trip.

## Grouping, search, filters, and ordering

The all-history query is bounded to the 250 most recent fixtures. The expected
amateur-team dataset is filtered client-side for immediate interaction. If
volume grows, preserve these semantics while moving pagination and filters to
indexed server queries.

Search is trimmed, case-insensitive, accent-insensitive, and covers opponent
and venue. Season, status, location, and time-group filters compose. Their URL
parameters survive refresh; invalid values are ignored. Empty data and an
empty filtered result have distinct states.

Groups and ordering are:

- Upcoming: scheduled at/after now, nearest kickoff first.
- Past · unresolved: scheduled before now, most recent first.
- Completed: most recent kickoff first.
- Cancelled: most recent kickoff first.

Created time and ID are deterministic tie-breakers. A past scheduled fixture is
never labelled completed.

## Cancellation and deletion

Cancellation preserves the fixture and changes `scheduled -> cancelled` with
null scores. It does not remove the record.

Hard deletion is supported only for scheduled/cancelled fixtures with no
call-ups or match events. The UI checks eligibility and asks for explicit
confirmation; the database is the final boundary. Its delete policy uses a
narrow owner-aware predicate to avoid recursive RLS checks while denying
foreign UUIDs and dependent history. Completed matches are never eligible.

Call-up/event foreign keys retain cascade behavior for deliberate full-tenant
cleanup, but an ordinary authenticated owner cannot use parent-match deletion
to erase those records.

> A match may reference only a season belonging to the same team.

> Do not hard-delete a match if doing so would remove historical football
> records.

## Dashboard and first-time setup

Dashboard progress remains derived from real rows. `match count > 0`
automatically completes “Schedule your first match”; no onboarding flag is
written. When player and match prerequisites exist, the next step links to the
implemented call-up manager. The upcoming-match card reports whether a squad is
ready and links directly to that match's call-up.

The dashboard fetches only the nearest future scheduled match and most recent
valid completed result. When an active season exists, both summaries are
scoped to it. A past scheduled fixture becomes an attention item and the
primary action links directly to result entry. The upcoming empty state links
to `/matches/new` once a season exists, and real upcoming fixtures link to
their detail page.

## Future integration contract

- Task 010 attaches call-ups to `match_id`; its lifecycle and eligibility rules
  are documented in [`callups.md`](./callups.md).
- Task 011 attaches events and eligible team players to `match_id`.
- Result entry atomically writes valid scores, normalized managed-team events,
  and the scheduled-to-completed transition; see [`results.md`](./results.md).
- Statistics aggregate completed matches by team, season, and player.
- Content generation reads the same opponent, kickoff, venue, result, and
  event records.

No later workflow should create a parallel fixture table or duplicate match
identity.
