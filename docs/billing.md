# Billing domain

Task 023 introduces a local billing domain so product checks do not contact a
payment provider on every request.

## Plans and entitlements

The application currently defines two plans:

- `free`: 30 active players, one historical season, one social template, and a
  ten-row leaderboard preview.
- `pro`: unlimited values for the defined limits and all premium entitlements.

The premium entitlements are `premium_social_templates`,
`high_resolution_exports`, `full_historical_access`, `advanced_statistics`,
`full_leaderboards`, and `watermark_removal`.

The definitions live in `features/billing/model.ts`. They are code-owned
product policy, not values accepted from a browser request.

## Subscription resolution

`features/billing/data.ts` resolves one team subscription through Supabase RLS.
When no local row exists, or when the stored plan/status is invalid or no
longer active, the resolver returns Free. A canceled subscription keeps its
plan only until `current_period_end`; `past_due`, `unpaid`, `paused`, and
expired subscriptions fail closed to Free. Unknown provider statuses are
normalized to an inactive state and never grant paid access.

`features/billing/entitlements.ts` exposes the server-side
`assertEntitlement(teamId, entitlement)` guard. Premium server actions and
route handlers should call it before doing privileged work. React-only checks
are not authorization.

## Database ownership

`subscriptions` is one row per team. Authenticated team owners can read their
own row, but cannot insert, update, or delete it. `billing_events` is an
idempotent provider-event log and is not exposed to authenticated users. Only
trusted server-side processing using `service_role` may write billing state.

The Free fallback is intentional: team creation does not need a billing row,
and a missing row never grants paid access. Later checkout and webhook tasks
can upsert the local subscription and record provider events without changing
the resolver contract.
