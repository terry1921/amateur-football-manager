# Team onboarding

Task 006 adds the first authenticated product flow. A user needs only a team
name to finish it; the other team details are optional.

## Routing flow

The shared access policy in `features/teams/access.ts` is the source of truth
for authenticated routing:

```text
Unauthenticated → /login
Authenticated + no owned team → /onboarding
Authenticated + owned team → /dashboard
```

The dashboard layout and onboarding layout enforce this policy. Auth pages use
the same ownership query to send an already signed-in user to the correct
destination. The query reads at most one team row and explicitly filters
`teams.owner_id` by the authenticated user's ID. Supabase RLS independently
enforces the same tenant boundary.

## Team creation

The onboarding form posts intent to a Server Action. Zod trims and validates
the values. The action obtains the user from the cookie-backed Supabase session;
there is no `owner_id` form field, and any unexpected form key is ignored.

The server derives a base slug from the validated name and attempts the insert
through the authenticated Supabase client. The database's case-insensitive
unique slug index is the source of truth. A `23505` collision retries with
`-2`, `-3`, and so on, which is also safe when concurrent requests choose the
same base slug. RLS remains enabled and no service-role client is used.

## Flow states and future steps

The current UI naturally moves through `idle → submitting → completed` using
the Server Action state and redirect. The page owns the step heading and the
form owns only the current step's fields, so a future coordinator can add
season creation, player import, coach invitations, or logo upload as additional
steps without changing the authenticated routing gate. No future steps are
stored or rendered yet.
