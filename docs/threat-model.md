# Task 020 threat model

## Scope

This threat model covers the MVP as deployed with Next.js, Supabase Auth,
Supabase PostgREST, PostgreSQL RLS, the browser client, and the PWA service
worker. It covers tenant data and the mutation paths that create matches,
call-ups, results, events, statistics, and social previews. It does not add
OAuth, MFA, passkeys, CAPTCHA, WAF/Cloudflare, enterprise IAM, SOC 2 controls,
or a monitoring platform.

## Assets

- Authentication sessions, recovery links, and account credentials.
- Team-owned players, seasons, matches, call-ups, normalized events, and
  derived statistics.
- Match history and the social-media preview generated from it.
- Supabase schema, RLS policies, RPCs, migrations, and CI credentials.
- Public application configuration, which is intentionally limited to the
  Supabase URL and publishable client key.

## Trust boundaries

```text
Browser / PWA cache
        |
        v
Next proxy + Server Actions ---- Supabase Auth cookies
        |
        v
Supabase REST/RPC API
        |
        v
PostgreSQL roles + RLS + constraints + lifecycle triggers
```

The browser and route guards are untrusted convenience layers. PostgreSQL is
the authorization boundary. A signed-in user is trusted only for their own
team root; a compromised session is treated as a malicious tenant owner.
Service-role access is trusted only in server-side operational contexts.

## Actors and abuse cases

| Actor                 | Relevant capability                   | Abuse case tested                                                                |
| --------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| Anonymous visitor     | Public app and auth endpoints         | Read or mutate tenant rows; invoke protected RPCs                                |
| Authenticated owner   | Own team through Data API and actions | Guess UUIDs, alter ownership, move rows across teams, bypass lifecycle           |
| Malicious owner       | Valid session for another tenant      | Enumerate another team's graph through filters, nested queries, RPCs, or exports |
| Compromised session   | Same privileges as its owner          | Write false match history, replay mutations, access cached private data          |
| Operator/service role | Trusted backend access                | Accidentally expose privileged credentials or bypass RLS                         |
| Malicious input       | Values entered into forms/URLs        | XSS, SQL injection, open redirect, unsafe image/export behavior                  |

## Controls relied on

- Ownership starts at `teams.owner_id = auth.uid()` and is resolved through
  every child relationship.
- RLS is enabled on all six application tables with operation-specific
  policies and composite foreign keys.
- Security-invoker RPCs validate scope and lifecycle inside the database.
- Result completion is the only path allowed to transition a scheduled match
  to completed; the trigger rejects direct table completion.
- The completion transaction reconciles managed-team goals with normalized
  goal events before committing.
- Auth sessions use Supabase SSR cookie handling; redirect paths are restricted
  to safe same-origin internal paths.
- The service worker uses network-first navigation and caches only the offline
  shell, icon, and same-origin static assets.
- Production responses include CSP, frame, MIME, referrer, permissions, and
  HSTS protections.

## Residual risks

- Supabase leaked-password protection is disabled in the remote project and
  must be enabled in Auth settings before launch.
- There is no application-specific rate limit for match creation, result
  entry, exports, or social generation. Supabase Auth rate limits still apply
  to authentication endpoints.
- The local RLS integration suite could not run because Docker Desktop was not
  available in this environment. CI or a Docker-enabled machine must run it.
- There are no Storage buckets today. Any future upload feature needs bucket,
  object-path, MIME, size, and delete-policy design before implementation.
- The current CSP permits inline scripts/styles required by the framework. A
  nonce-based policy is a future hardening option if the rendering setup allows
  it.
