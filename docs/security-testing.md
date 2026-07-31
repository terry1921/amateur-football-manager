# Security and RLS testing

## Purpose

The security suite proves the application's central tenant-isolation invariant:
an authenticated user can operate on their own team's records and cannot read
or mutate records owned by another user. It is a regression boundary for all
six public application tables:

- `teams`
- `seasons`
- `players`
- `matches`
- `callups`
- `match_events`

Every new tenant-owned table must include positive and negative RLS tests before
its migration is considered complete.

## Requirements and command

Install the repository dependencies and have Docker or another
Docker-compatible runtime available. The Supabase CLI and Vitest versions are
pinned in `package.json`.

Run the complete suite with:

```bash
npm run test:security
```

The runner checks for the local Supabase stack, starts it when necessary,
resets only the local database, applies every migration, runs the pgTAP layer,
and then runs the Supabase JS layer. If the runner started Supabase, it stops it
on completion. A stack that was already running is left running.

## Safety boundary

The runner obtains API keys directly from `supabase status -o env`; it captures
that output instead of printing it. These dedicated variables are forwarded
only to the child test process:

```text
SUPABASE_TEST_URL
SUPABASE_TEST_PUBLISHABLE_KEY
SUPABASE_TEST_SECRET_KEY
```

The test environment rejects any URL that is not plain HTTP on `127.0.0.1`,
`localhost`, or `::1`. Database reset always includes the CLI's `--local` flag.
The suite does not read the application's `.env.local`, does not accept a
hosted Supabase URL, and requires no production credential.

## Two complementary layers

### PostgreSQL and policy layer

`supabase/tests/database/rls_policies.test.sql` runs transactionally through
pgTAP. It impersonates Supabase database roles and verifies runtime isolation,
RLS metadata, policy commands and roles, update checks, grants, indexes,
anonymous denial, and service-role bypass. The transaction is rolled back.

### Application-client layer

`tests/security/**/*.rls.test.ts` talks to the real local Auth and Data APIs
through `@supabase/supabase-js`. Each file creates four explicitly separated
clients:

- `adminSetupClient`: local secret key; fixture setup and cleanup only.
- `userAClient`: publishable key plus User A's genuine password session.
- `userBClient`: publishable key plus User B's genuine password session.
- `anonymousClient`: publishable key with no session.

No authorization assertion uses `adminSetupClient`.

## Users, fixtures, and isolation

Every test file has its own stable namespace. User IDs and application row IDs
are deterministic UUIDs derived from that namespace, while passwords are
randomly generated in memory and never logged. Addresses use the reserved
`example.test` domain.

Each namespace owns two complete and independent graphs:

```text
User A -> Team A -> Season A, Players A, Match A -> Callup A, Event A
User B -> Team B -> Season B, Players B, Match B -> Callup B, Event B
```

Setup removes stale rows for the namespace before recreating its users. Cleanup
removes the tenant graphs and Auth users. The orchestration-level local database
reset provides a second clean-start guarantee.

Security files run serially (`fileParallelism: false`, one worker) because they
share one local Auth and database stack. Regular unit tests exclude `*.rls.test.ts`
so `npm test` remains fast and does not unexpectedly start infrastructure.

## Coverage

The suite tests:

- positive and negative CRUD for every application table;
- real foreign UUID selection, updates, deletes, and child inserts;
- forged ownership and relationship fields;
- `WITH CHECK` protection against cross-tenant row movement;
- mixed-team matches, call-ups, scorers, and assisting players;
- anonymous CRUD denial for every table;
- bulk insert, update, and delete behavior;
- broad, `neq`, `in`, `or`, `not`, range, and order filters;
- nested teams/players, seasons/matches, and matches/callups/events queries;
- preservation of the foreign tenant after blocked operations.

An unauthorized mutation may either return PostgreSQL code `42501` or affect
zero rows, depending on whether the target row is hidden before the proposed
change is checked. Mixed relationships that pass RLS for the owned parent but
violate a composite tenant foreign key are asserted as `23503`. Exact error
message text is intentionally not used.

## Adding a tenant-owned table

1. Add its migration, foreign keys, tenant indexes, grants, and RLS policies.
2. Add deterministic fixture IDs and rows in `tests/security/setup/fixtures.ts`.
3. Add a focused `*.rls.test.ts` file.
4. Prove own SELECT/INSERT/UPDATE and any feature-eligible DELETE.
5. Prove foreign SELECT/INSERT/UPDATE/DELETE and row movement are blocked.
6. Add anonymous and relationship-expansion coverage where applicable.
7. Extend the pgTAP metadata/runtime assertions.
8. Run `npm run test:security` from a clean local environment.

## Contributor checklist

- [ ] RLS enabled.
- [ ] SELECT own rows succeeds.
- [ ] SELECT foreign rows returns nothing.
- [ ] INSERT into own tenant succeeds.
- [ ] INSERT into foreign tenant fails.
- [ ] UPDATE own row succeeds.
- [ ] UPDATE foreign row fails or affects zero rows.
- [ ] Moving a row to a foreign tenant fails.
- [ ] DELETE follows the feature lifecycle rule (success when eligible, denied
      for history-preserving records such as players and seasons).
- [ ] DELETE a foreign row fails or affects zero rows.
- [ ] Anonymous access is blocked.
- [ ] UUID guessing is blocked.
- [ ] Nested relationship queries do not leak data.

## RPC and Storage status

`public.set_updated_at()` is an invoker-context trigger function with a fixed
empty search path, and execution is revoked from public API roles.
`public.can_delete_owned_match(uuid, uuid)` is a stable, read-only
`SECURITY DEFINER` predicate used by the match delete policy to avoid recursive
RLS evaluation. It checks `auth.uid()` ownership internally, returns only a
boolean, and is unavailable to anonymous clients.

`public.replace_match_callup(uuid, uuid[])` is a `SECURITY INVOKER` mutation
with a fixed empty search path. It locks the owned match, validates the complete
selection, and replaces its call-ups in one transaction. Anonymous execution
is revoked. The focused pgTAP suite in
`supabase/tests/database/callup_management.test.sql` covers lifecycle,
eligibility, tenant isolation, duplicates, and rollback behavior.

No Storage bucket or `storage.objects` authorization policy has been created
for the MVP yet. Storage isolation tests are deferred until the task that
defines those buckets and policies; database RLS does not protect Storage
objects.

## CI behavior

`.github/workflows/security-tests.yml` runs the same local-only command for
pull requests and main-branch pushes that change migrations, Supabase
configuration, security tests, their workflow, or their package configuration.
CI uses Docker-backed local Supabase and requires no repository secret.

## Common failures

- **Docker is unavailable:** start Docker Desktop or another compatible runtime.
- **Ports are occupied:** stop the conflicting local process or another
  Supabase project.
- **A previous run was interrupted:** rerun the command; the database reset and
  namespace pre-cleanup restore deterministic state.
- **`42501` changed to success:** treat it as a possible RLS regression; inspect
  the new migration before changing the test.
- **`23503` changed:** inspect the composite tenant foreign keys and determine
  whether schema integrity was weakened.
- **A security file passes under `npm test`:** confirm it still ends in
  `.rls.test.ts` and remains included by `vitest.security.config.ts`.
