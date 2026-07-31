# Database authorization

The database is the authorization boundary for the Amateur Football Manager.
Browser routes may improve the experience by hiding unavailable actions, but
they are not trusted to decide which records a user may access.

## Ownership model

```text
auth.users.id
    |
    `-- teams.owner_id                         direct ownership root
          |
          |-- seasons.team_id                  owned through team
          |-- players.team_id                  owned through team
          `-- matches.team_id                  owned through team
                |
                |-- callups.match_id           owned through match -> team
                `-- match_events.match_id      owned through match -> team
```

`teams.owner_id = auth.uid()` is the only ownership root. A team may have only
one owner in the MVP. The policies do not introduce roles, shared teams,
invitations, or public records.

`callups` and `match_events` also store a `team_id`, but their policies
deliberately do not trust it. They authorize the row by resolving its
`match_id` to `matches.team_id`, then resolving that team to
`teams.owner_id`. Composite foreign keys separately guarantee that the stored
match, team, and player identifiers describe one consistent tenant. A second
composite foreign key guarantees that an event player was selected in that
match's call-up.

## Policy behavior

All six public application tables have Row Level Security enabled with
operation-specific policies restricted to the `authenticated` database role:

- `SELECT` exposes only rows in the signed-in user's ownership graph.
- `INSERT` uses `WITH CHECK` to reject rows outside that graph.
- `UPDATE` uses `USING` for the existing row and `WITH CHECK` for the proposed
  row. This blocks changing `teams.owner_id` and moving child rows to another
  user's team or match.
- `DELETE` can target only rows in the signed-in user's ownership graph where
  the feature's lifecycle permits deletion.

Match deletion has an additional lifecycle boundary: only scheduled/cancelled
fixtures without call-ups or match events are visible to the delete policy.
`public.can_delete_owned_match(uuid, uuid)` is a narrowly scoped
`security definer` predicate used to avoid recursive match/call-up RLS
evaluation. It checks `auth.uid()` ownership internally and returns only a
boolean, so calling it with a foreign UUID cannot reveal foreign fixture data.
Anonymous execution is revoked.

Call-up writes have a separate lifecycle boundary: authenticated clients may
mutate call-ups only while the referenced match is scheduled. The
`replace_match_callup` security-invoker function validates the entire submitted
set before changing rows, rejects duplicates and foreign or newly unavailable
players, and performs the replacement atomically. RLS still resolves ownership
through the match, while a database trigger protects the lifecycle and makes
call-up identity immutable for direct table mutations. Completed and cancelled
match call-ups are read-only.

Event writes are limited to scheduled matches, and completed-match event
history is read-only. `complete_match_with_events` runs as a security-invoker
transaction, verifies the authenticated owner through RLS-visible rows,
validates call-up membership, reconciles managed-team goals, replaces events,
and completes the match atomically.

`players` and `seasons` intentionally expose no authenticated `DELETE`
privilege or policy. Player departures use the `inactive` status, and a trigger
makes `players.team_id` immutable. This preserves attribution for historical
call-ups, goals, cards, and other match events even if a direct Data API request
tries to bypass the application UI.

Anonymous table privileges are explicitly revoked. Authenticated clients and
the service role receive the table privileges required by the Data API.
The service role has PostgreSQL's RLS-bypass capability and has no dedicated
policy; it must remain restricted to trusted server environments.

These policies apply equally to direct SQL running as the API roles,
Supabase's REST API, and Supabase client libraries because those APIs execute
against the same PostgreSQL roles and policies.

## Performance

Ownership predicates use indexed equality lookups:

- `teams_owner_id_idx` supports direct owner-to-team access.
- Primary keys cover every `teams.id` and `matches.id` ownership join.
- Existing child indexes beginning with `team_id` or `match_id` support the
  normal tenant-filtered queries.

`auth.uid()` is wrapped in a scalar subquery so PostgreSQL can initialize it
once per statement rather than once per candidate row. The call-up replacement
function runs as the caller and therefore does not bypass RLS. The only
security-definer application helper is the narrow boolean match-delete
predicate described above.

## Security regression tests

`supabase/tests/database/rls_policies.test.sql` creates two isolated owners and
checks:

- each owner can read and mutate their own graph;
- guessed UUIDs from another tenant do not reveal rows;
- cross-tenant inserts, owner changes, team swaps, and match swaps fail;
- cross-tenant updates and permitted deletes affect no rows;
- player and season hard deletion is denied to authenticated clients;
- anonymous access has no table privileges;
- the service role retains full operational access.

The tests impersonate the same `anon`, `authenticated`, and `service_role`
PostgreSQL roles used by Supabase's Data API, so a failure in SQL, REST, or a
Supabase client query reaches the same enforcement point.

The permanent integration runner also creates real local Auth users and repeats
the tenant attacks through separate publishable-key Supabase JS clients. Its
local-only lifecycle, CI behavior, and contributor guidance are documented in
`docs/security-testing.md`.
