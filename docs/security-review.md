# Task 020 — Production security review

## Executive conclusion

The audit found and fixed three confirmed application vulnerabilities and one
confirmed least-privilege weakness: vulnerable production dependency paths,
direct result-completion bypass, an unnecessary `SECURITY DEFINER` RPC, and
excess authenticated table privileges. No known critical or high application
vulnerability remains in the reviewed code and remote schema.

The release decision is **conditionally ready**. Before calling the production
launch complete, enable Supabase leaked-password protection and run the local
security integration suite in Docker/CI. Those are explicit release gates,
not unresolved product functionality.

## Overall rating

**Medium residual risk / conditionally ready.** The remaining risk is driven by
remote Auth configuration, lack of application-specific mutation rate limits,
and the inability to execute the Docker-backed RLS suite in this environment.
The remote advisor has one remaining warning: leaked-password protection is
disabled.

## Review method and attack paths

The review inspected the application, migrations, policies, RPCs, proxy,
service worker, package graph, CI, and environment handling. It also queried
the remote Supabase schema, policies, grants, functions, triggers, tables,
storage metadata, and security advisors. The following abuse paths were
actively checked:

1. Anonymous and cross-tenant reads/writes through table APIs and filters.
2. Ownership changes and foreign-team relationship forgery.
3. Direct completed-match inserts/updates outside the result RPC.
4. RPC execution and `SECURITY DEFINER` exposure.
5. Excess table privileges for the authenticated role.
6. UUID guessing, nested relationship access, and derived-statistics scope.
7. XSS/HTML sinks, open redirects, SQL construction, exports, and image URLs.
8. Secret leakage in tracked files and build configuration.
9. Auth cookie handling, password flows, recovery redirects, and PWA caching.

## Findings

| ID    | Severity      | Finding                                                                                                       | Status                                 |
| ----- | ------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| F-001 | High          | Production `next` dependency tree resolved vulnerable `postcss` and `sharp` versions.                         | Fixed; audit clean                     |
| F-002 | High          | Authenticated direct table writes could complete a match without score/event reconciliation.                  | Fixed by remote trigger and RPC gate   |
| F-003 | Medium        | Authenticated execution of a `SECURITY DEFINER` delete predicate created an unnecessary elevated RPC surface. | Fixed; function is invoker             |
| F-004 | Medium        | Authenticated ACLs retained `TRUNCATE`, `TRIGGER`, and `REFERENCES`.                                          | Fixed; remote ACL verified             |
| F-005 | Medium        | Supabase leaked-password protection is disabled.                                                              | Open release configuration gate        |
| F-006 | Low/Medium    | No app-level rate limit exists for high-value mutations or exports.                                           | Accepted residual risk; future control |
| F-007 | Medium        | Docker-backed local RLS suite was unavailable in this environment.                                            | Verification gap; CI gate              |
| F-008 | Informational | No Storage buckets or upload paths exist in the MVP.                                                          | Not applicable; future design required |

## Authentication and session review

Supabase SSR manages auth cookies, the proxy refreshes claims, and protected
server operations use authenticated user checks. Callback and recovery
redirects accept only safe internal paths; protocol-relative, backslash, and
external-origin values are rejected. Password reset and sign-out behavior do
not expose an account-existence response. Frontend password schemas require at
least eight characters, while the local Supabase config's lower Auth default
should be aligned in the hosted project.

The remaining Auth action is to enable leaked-password protection in Supabase
Auth. MFA, passkeys, OAuth, CAPTCHA, and enterprise identity controls are
deferred by scope.

## Authorization and RLS

All six application tables have RLS enabled remotely. The ownership graph is:

`auth.users → teams → seasons/players/matches → callups/match_events`.

| Table          | Own rows                                 | Foreign rows   | Authenticated table grants     |
| -------------- | ---------------------------------------- | -------------- | ------------------------------ |
| `teams`        | CRUD subject to ownership                | Hidden/blocked | SELECT, INSERT, UPDATE, DELETE |
| `seasons`      | Create/read/update own team rows         | Hidden/blocked | SELECT, INSERT, UPDATE         |
| `players`      | Create/read/update own team rows         | Hidden/blocked | SELECT, INSERT, UPDATE         |
| `matches`      | CRUD subject to lifecycle                | Hidden/blocked | SELECT, INSERT, UPDATE, DELETE |
| `callups`      | CRUD only for eligible scheduled matches | Hidden/blocked | SELECT, INSERT, UPDATE, DELETE |
| `match_events` | CRUD only for eligible scheduled matches | Hidden/blocked | SELECT, INSERT, UPDATE, DELETE |

Remote verification also confirms authenticated users do not retain
`TRUNCATE`, `TRIGGER`, or `REFERENCES` on any application table. `players` and
`seasons` intentionally have no authenticated delete privilege to preserve
history.

## Domain transaction review

Result entry now has a database-enforced boundary. A direct table completion is
rejected with SQLSTATE `55000`; only `complete_match_with_events` can set the
transaction-local authorization marker. That function validates ownership,
scheduled status, call-up membership, event shape, and managed-team
goal-to-event reconciliation before replacing events and completing the match
in one transaction.

Call-up replacement is similarly atomic and lifecycle-scoped. Statistics are
security-invoker projections over completed matches and normalized events; no
persisted aggregate columns were introduced by this review.

## Input, injection, and export review

No raw SQL path interpolates user-controlled values. Forms validate with Zod,
database constraints repeat critical invariants, and RPC arguments are typed
and validated in PostgreSQL. No `dangerouslySetInnerHTML`, `innerHTML`,
`eval`, or `new Function` sink was found. React escapes displayed values, and
the social generator draws text on a canvas rather than injecting HTML. The
export is client-side and does not create a server-side file or fetch arbitrary
URLs on behalf of the server.

## Storage, secrets, and privacy

There are no Storage buckets, object policies, upload endpoints, or server-side
file handlers. URL fields are stored as data values only. If uploads are added,
they need dedicated object-path ownership, MIME/size validation, and Storage
RLS tests.

`.env.local` is ignored and not tracked. The repository contains no service
role key, JWT secret, or private credential in source/history. The public
Supabase URL and publishable key are client configuration, not secrets; the
service role must remain server-only.

## Headers, PWA, and dependencies

The production server was started locally and its login response verified CSP,
HSTS, clickjacking, MIME-sniffing, referrer, permissions, and private-cache
headers. The service worker uses network-first navigation and caches no
authenticated dynamic response. Dependency audit now reports zero production
vulnerabilities after the Next/postcss/sharp fixes.

## Test evidence

Passed:

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test -- --run` — 50 files, 183 tests
- `npm run build` — Next.js 16.2.12, 40 static pages
- `npm audit --omit=dev` — 0 vulnerabilities
- Remote Supabase migration, ACL, trigger, function, RLS, storage, and advisor
  checks

Blocked:

- `npm run test:security` could not start local Supabase because Docker Desktop
  was unavailable. Run it in CI or with Docker before launch.
- The deep security scan remained at preflight because native multi-agent v2
  capability could not be confirmed by the scan environment. The manual audit
  and remote checks above are the available evidence; this is not reported as
  a completed deep scan.

## Changed files

- `next.config.ts`
- `package.json` and `package-lock.json`
- `supabase/migrations/20260801193733_security_hardening.sql`
- `supabase/migrations/20260801194305_protect_result_entry.sql`
- `supabase/migrations/20260801194701_security_privilege_hardening.sql`
- `supabase/tests/database/match_management.test.sql`
- `supabase/tests/database/rls_policies.test.sql`
- `docs/security.md`, `docs/security-testing.md`, and the three Task 020 docs

## Launch checklist and future recommendations

1. Enable Supabase leaked-password protection and confirm the hosted Auth
   password policy matches the application's eight-character minimum.
2. Run `npm run test:security` with Docker in CI and retain the result.
3. Add mutation/export rate limiting when abuse volume or public sharing makes
   it necessary.
4. Add structured security event logging with privacy-safe retention when an
   operational monitoring platform is introduced.
5. Re-run dependency and security review before adding uploads, public sharing,
   new roles, or server-side media processing.

Within the current MVP scope, there are no known critical or high application
vulnerabilities after the fixes above. Production launch should proceed only
after the two explicit checklist gates are complete.
