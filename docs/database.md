# Database schema

This document records implementation decisions for the MVP schema. The product
model and feature scope remain defined in `MVP.md`.

## Relationships

```text
auth.users
    |
    `-- teams
          |
          |-- seasons
          |     `-- matches
          |           |-- callups
          |           `-- match_events
          |
          `-- players
                |-- callups
                `-- match_events
```

Supabase Auth's `auth.users` table is the identity source. `profiles` is not
needed by the current MVP; a separate profile table can be introduced later if
the application needs user-facing metadata that does not belong in Auth.

`callups` and `match_events` include `team_id` so composite foreign keys can
guarantee that their match and players belong to the same team. `matches` uses
the same approach to guarantee that its season belongs to its team. These
slightly redundant identifiers turn important tenant invariants into simple,
declarative constraints instead of privileged triggers.

## Tables and constraints

- `teams`: team identity, owner, branding, and location. Names and slugs cannot
  be blank. Slugs are unique case-insensitively.
- `seasons`: a team's dated competition period. Status is `draft`, `active`, or
  `completed`; end dates cannot precede start dates. A partial unique index
  permits only one active season per team.
- `players`: team roster records. Position is `GK`, `DEF`, `MID`, or `FWD` and
  status is `active`, `injured`, `suspended`, or `inactive`. Optional shirt
  numbers use the flexible amateur-football range `0` through `999` and are not
  unique, allowing temporary duplicates and unassigned numbers.
- `matches`: scheduled, completed, or cancelled fixtures. The home/away value is
  `home`, `away`, or `neutral`. Scores use managed-team/opponent orientation,
  must be nonnegative, and are present only for completed matches. Scheduled
  and cancelled matches must have null scores. Opponent, venue, and note
  lengths are bounded at the database boundary.
- `callups`: one player selection per match, with status `called_up`,
  `confirmed`, or `declined`.
- `match_events`: normalized goals and cards with a required nonnegative
  minute, optional added time, and optional notes. Each event player must be
  selected in the same match call-up through a composite foreign key. The
  legacy `related_player_id` column remains for schema compatibility, but Task
  012.5 does not create or edit assists.

All primary keys are database-generated UUIDs. Required display names are
checked after trimming whitespace. Tables with mutable records have
`created_at`, `updated_at`, and a shared trigger that maintains `updated_at`.
Match events retain `created_at` for deterministic ordering when multiple rows
share the same football minute. `stoppage_time` and `notes` are event metadata,
not denormalized statistics.

## Delete behavior

- `teams.owner_id -> auth.users.id`: `RESTRICT`. Removing an Auth user cannot
  silently erase team and match history; ownership must be transferred or the
  team deliberately removed first.
- `seasons.team_id` and `players.team_id`: `CASCADE`. Deliberately deleting a
  team removes its complete tenant data.
- `matches.team_id`: `CASCADE`. Team deletion removes matches.
- `matches(team_id, season_id) -> seasons(team_id, id)`: initially deferred
  `NO ACTION`. A season referenced by match history cannot be deleted at
  transaction commit, while a whole-team deletion can remove both records in
  one atomic operation.
- Call-up/event match relationships: `CASCADE` for deliberate tenant cleanup.
  The authenticated match-delete policy permits only scheduled/cancelled
  fixtures with no call-ups or events, so ordinary feature use cannot activate
  that cascade or erase history.
- Call-up/event player relationships: initially deferred `NO ACTION`. A player
  with historical participation cannot be deleted at transaction commit; V1
  should set the player's status to `inactive`. Deferral lets a whole-team
  deletion remove the overlapping match/player graph atomically.

Authenticated application users have no `DELETE` privilege or delete policy on
`players`, including players that do not yet have historical references. A
player's `team_id` is also immutable. The service role retains deletion only
for trusted maintenance and full-tenant cleanup; ordinary roster departures
must use `status = 'inactive'`.

## Indexes

- `teams_owner_id_idx`: owner-to-team lookup.
- `teams_slug_unique_idx`: case-insensitive public slug lookup and uniqueness.
- `seasons_team_status_idx`: season lists and status filtering.
- `seasons_one_active_per_team_idx`: enforces and finds the active season.
- `players_team_status_idx`: roster and availability lists.
- `matches_team_kickoff_idx`: upcoming and recent team matches.
- `matches_season_kickoff_idx`: season match lists and statistics.
- `matches_team_season_idx`: covers the team/season integrity relationship.
- `matches_team_status_kickoff_idx`: scheduled/completed dashboard queries.
- `callups_player_id_idx`: a player's call-up history. The unique
  `(match_id, player_id)` and `(team_id, match_id, player_id)` constraints
  index match call-ups and support the event membership foreign key.
- `callups_team_match_idx` and `callups_team_player_idx`: cover tenant-scoped
  match and player foreign keys.
- `match_events_match_type_idx`: match event lists and match-level aggregation.
- `match_events_player_type_idx`: player statistics and leaderboards.
- `match_events_team_match_idx`, `match_events_team_player_idx`, and
  `match_events_team_related_player_idx`: cover tenant-scoped event foreign
  keys; the related-player index also supports assist aggregation.

Primary keys and unique constraints also create their required indexes.

## Row Level Security

RLS is enabled on all six public application tables. Owner-scoped lifecycle policies
follow each row's relational path to `teams.owner_id`; call-ups and match events
authorize through their referenced match instead of trusting a submitted
`team_id`. The complete authorization model and regression-test coverage are
documented in `docs/security.md`.

Call-up inserts, updates, and deletes are limited to scheduled matches. The
`replace_match_callup` invoker RPC validates an owner's complete selection and
applies it atomically. Newly selected players must be active and belong to the
match team; an already-selected player may remain after becoming injured,
suspended, or inactive so historical context is not silently rewritten.

Completed and cancelled matches are immutable. Match team identity cannot
change, and status transitions are restricted to future-compatible
`scheduled -> completed` plus Task 009's `scheduled -> cancelled`.
Event writes are allowed only while a match is scheduled; the atomic
`complete_match_with_events` invoker function replaces draft events, enforces
goal reconciliation, and completes the match in one transaction.

## Deferred work

- Authentication flows remain Task 004.
- The initial beta's one-team-per-owner limit remains an application rule rather
  than a database constraint, preserving the planned path to multi-team plans.
- Statistics, standings, and opponent-player event workflows remain later tasks.
- Seed data remains separate from schema migrations and will be introduced by a
  dedicated development-data task.
