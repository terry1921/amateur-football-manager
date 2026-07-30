# Matchday

Matchday is a mobile-first SaaS for managing amateur football teams. The MVP scope and product decisions live in [`MVP.md`](./MVP.md).

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` using the public values
from your Supabase project's Connect dialog. Do not use a secret or legacy
service-role key for either variable. Set `NEXT_PUBLIC_SITE_URL` to the
application origin used in authentication emails.

The interface is available in English at `/en` and Spanish at `/es`. Requests to `/` are redirected to the best matching supported locale, falling back to English.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

The permanent tenant-isolation suite uses a real local Supabase stack:

```bash
npm run test:security
```

Its lifecycle, safety checks, and coverage are documented in
[`docs/security-testing.md`](./docs/security-testing.md).

## Supabase local development

The Supabase CLI is pinned as a project dependency. A Docker-compatible runtime
is required to run the local stack.

```bash
npm run supabase:start
npm run supabase:status
npm run db:types
npm run supabase:stop
```

Migrations belong in `supabase/migrations`. To connect this workspace to a
hosted development project later, run `npx supabase login` and
`npx supabase link --project-ref <project-ref>`; neither step is needed for the
local setup.

Authentication setup, routes, email behavior, and production configuration are
documented in [`docs/authentication.md`](./docs/authentication.md). Team
onboarding, seasons, players, matches, and match call-ups are documented in
`docs/`, including the call-up lifecycle in
[`docs/callups.md`](./docs/callups.md).
