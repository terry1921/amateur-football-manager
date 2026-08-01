# Task 020 security hardening record

This document records changes made only for confirmed security findings. No
football workflow or product feature was added.

## Database hardening

### Privilege escalation surface

`public.can_delete_owned_match(uuid, uuid)` was a `SECURITY DEFINER` function
executable by authenticated clients. Although it returned only a boolean, the
definer context was an unnecessary privilege boundary. It is now
`SECURITY INVOKER`, has an empty search path, and remains read-only and
owner-scoped. The remote Supabase security advisor no longer reports this
function.

### Result integrity

Direct authenticated inserts or updates could previously mark a scheduled
match as completed without going through the result transaction. A new
invoker trigger rejects completed inserts and scheduled-to-completed updates.
The trusted `complete_match_with_events` RPC sets a transaction-local flag,
performs its existing validation and score/event reconciliation, and commits
the match plus normalized events atomically.

### Least privilege

Authenticated table ACLs previously retained `TRUNCATE`, `TRIGGER`, and
`REFERENCES` on the application tables. The remote migration now revokes all
table privileges and grants only the required Data API CRUD set:

| Table          | Authenticated grants                   |
| -------------- | -------------------------------------- |
| `teams`        | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `seasons`      | `SELECT`, `INSERT`, `UPDATE`           |
| `players`      | `SELECT`, `INSERT`, `UPDATE`           |
| `matches`      | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `callups`      | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `match_events` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

Remote verification confirms the three non-API privileges are false for every
table.

## Web and dependency hardening

- Added CSP, `X-Content-Type-Options`, `X-Frame-Options`, strict referrer and
  permissions policies, and production HSTS in `next.config.ts`.
- Updated Next.js to `16.2.12` and forced patched production dependency paths
  for `postcss` (`8.5.25`) and `sharp` (`0.35.3`). `npm audit --omit=dev`
  reports zero vulnerabilities.
- Confirmed the production server emits the expected headers and private
  cache behavior for the login page.

## Deferred controls

The following are intentionally outside this MVP hardening change: OAuth,
MFA, passkeys, CAPTCHA, WAF/Cloudflare, SOC 2, enterprise IAM, audit
dashboards, and monitoring-platform integration. Leaked-password protection is
not a code change and remains a required Supabase Auth configuration step.
