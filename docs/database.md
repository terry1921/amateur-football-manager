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
  numbers use the flexible amateur-football range `0` through `99` and are not
  unique, allowing temporary duplicates and unassigned numbers.
- `matches`: scheduled, completed, or cancelled fixtures. The home/away value is
  `home`, `away`, or `neutral`. Scores must be nonnegative, supplied as a pair,
  and present for completed matches. Scheduled and cancelled matches may have
  no score.
- `callups`: one player selection per match, with status `called_up`,
  `confirmed`, or `declined`.
- `match_events`: goals and cards with an optional nonnegative minute. An assist
  is represented only as `related_player_id` on a `goal`; there is no separate
  `assist` event. This prevents statistics from double-counting the same assist.

All primary keys are database-generated UUIDs. Required display names are
checked after trimming whitespace. Tables with mutable records have
`created_at`, `updated_at`, and a shared trigger that maintains `updated_at`.
Match events retain only `created_at` because each row represents one atomic
event.

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
- Call-up/event match relationships: `CASCADE`. Deleting a match removes its
  dependent workflow records.
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
  `(match_id, player_id)` constraint also indexes match call-ups.
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

## Deferred work

- Authentication flows remain Task 004.
- The initial beta's one-team-per-owner limit remains an application rule rather
  than a database constraint, preserving the planned path to multi-team plans.
- Match, call-up, result, and statistics workflows remain later tasks.
- Seed data remains separate from schema migrations and will be introduced by a
  dedicated development-data task.
