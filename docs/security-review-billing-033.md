# Billing Security Review — Task 033

Review date: 2026-08-12
Scope: billing domain, subscription/event migration and RLS, entitlement
resolution, Supabase client and service-role use, public environment
configuration, redirects, error logging, and the currently available API
surface.

## Result

No Critical or High findings were identified in the implemented billing
surface. The local billing domain is not yet a payment integration: there are
no checkout, customer-portal, or webhook routes in the reviewed source. This
means there is no current public payment ingress to forge, replay, redirect,
or use to select a price; it also means those controls must be implemented and
tested before such routes are introduced.

## Verified controls

| Area                 | Evidence                                                                                                                                                                                                   | Result                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Plan and price trust | Plan definitions and entitlements are code-owned. The subscription migration only accepts `free` and `pro`; no price or provider product value is accepted from a browser request.                         | Pass                        |
| Subscription RLS     | `anon` and `authenticated` lose all table privileges first; authenticated users regain read-only access, limited by the owning team policy.                                                                | Pass                        |
| Direct mutation      | Authenticated callers do not receive INSERT, UPDATE, or DELETE grants for `subscriptions` or any access to `billing_events`.                                                                               | Pass                        |
| Cross-team access    | The select policy binds `subscriptions.team_id` to a team owned by `auth.uid()`.                                                                                                                           | Pass                        |
| Event replay         | `(provider, provider_event_id)` is unique, so a trusted processor cannot persist the same provider event twice.                                                                                            | Pass                        |
| Entitlements         | Unknown plans/statuses, `past_due`, `unpaid`, `paused`, malformed dates, expired subscriptions, and post-period cancellations resolve to Free. A cancellation remains active only through its paid period. | Pass                        |
| Service role         | No application `service_role` or Stripe client is present in the reviewed source. The database service role is the only role granted billing writes.                                                       | Pass, with future guardrail |
| Secrets/config       | The public client only reads the publishable Supabase key. The local environment file is ignored and is not tracked; no billing secret is exposed through `NEXT_PUBLIC_*`.                                 | Pass                        |
| Redirects            | There is no billing portal redirect. The shared internal-path helper rejects absolute, protocol-relative, backslash, and control-character paths.                                                          | Pass                        |
| Logs                 | Current generic error logging records stable metadata rather than raw error objects. No billing webhook payload is logged by application code.                                                             | Pass                        |

## Automated coverage added by Task 030

- `tests/security/billing-access.rls.test.ts`: direct Free entitlement calls,
  inactive `pro` plan tampering, expiration, cancellation-at-period-end, and
  `past_due` fail-closed behavior.
- `tests/security/billing.rls.test.ts`: actual Supabase JS attempts to read a
  foreign subscription, create/alter/delete subscriptions, forge a billing
  event, and replay an event through the trusted client.
- `supabase/tests/database/billing_security.test.sql`: transactional database
  coverage for privilege boundaries, foreign-team isolation, plan constraints,
  direct mutation, event forgery, replay, and trusted state transitions.

## Findings

### Resolved medium — Active or trialing Pro requires a future period end

`subscriptionHasAccess` now fails closed when an `active` or `trialing`
subscription has a missing, malformed, or expired `current_period_end`.
Consequently, a partial provider write resolves to Free without Pro
entitlements. The default no-row Free subscription remains available, and a
`canceled` subscription remains active through its valid paid period. The
model regression covers both active and trialing rows without a period end.

### Resolved low — Billing event minimization, redaction, and retention

`billing_events.payload` is always persisted as an empty object. Reconciliation
uses only typed columns: provider, provider event ID, event type, optional team
and subscription references, receipt/processing timestamps, and a bounded
processing error code. Raw provider bodies, signature headers, customer data,
payment data, and arbitrary provider metadata must never be stored in
`billing_events` or application logs. Service-role logs may contain only the
provider, provider event ID, event type, and stable error code.

Billing event records are retained for 30 days from `received_at`, then purged
by the operational retention job. The job must delete only records older than
that threshold and must not export payloads before deletion. Any future change
that needs more data requires a security review and an explicit schema-level
allowlist rather than reusing `payload` for raw provider JSON.

## Required security gates for future payment endpoints

These are release prerequisites, not currently exploitable findings:

1. Verify the provider signature against the exact raw request body before
   parsing it or issuing database writes; reject unsigned/invalid events.
2. Insert or reserve the provider event ID atomically before applying state,
   and treat duplicate deliveries as idempotent success.
3. Obtain price IDs from a server allowlist keyed by a code-owned plan; never
   accept plan, amount, price, customer, or team identifiers as authority from
   the browser.
4. Derive the team from authenticated ownership on checkout and from a
   provider-to-team mapping on webhooks. Never trust provider metadata alone
   without checking the persisted mapping.
5. Keep the service-role key server-only and use it only in the verified
   webhook/operational path; browser and ordinary request code must use the
   cookie-backed client.
6. Build portal return URLs from an allowlisted internal path or configured
   canonical origin; do not redirect to request-supplied absolute URLs.
7. Gate every Pro API/server action with `assertEntitlement`; UI visibility is
   not authorization.

## Verification status

The focused model tests and formatting checks completed successfully. The
database-backed security suite was attempted but could not be completed in
this environment: Docker is installed, while Supabase could not create the
expected local database container. Run `npm run test:security` in an
environment with a healthy Docker/Supabase local stack to execute the two RLS
suites and pgTAP coverage.
