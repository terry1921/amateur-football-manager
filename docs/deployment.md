# Deployment

## Supported production shape

Matchday is a Next.js application intended to run on a Node.js 22-compatible
host such as Vercel, with Supabase providing Auth and PostgreSQL. There is no
Dockerfile or provider-specific deployment file in the repository; the host
must run the standard Next.js build and start commands.

## Required application variables

| Variable                               | Visibility           | Purpose                                                                    |
| -------------------------------------- | -------------------- | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public               | Supabase project API URL.                                                  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public               | Supabase publishable client key. Never replace it with a service-role key. |
| `NEXT_PUBLIC_SITE_URL`                 | Public configuration | Canonical application origin used by Auth links and redirects.             |

These are the only application variables read by the source. `.env.example`
contains safe placeholders. Supabase CLI access tokens, database passwords,
SMTP credentials, and hosting credentials belong in the operator's secret
manager and are not application runtime variables.

## Clean deployment procedure

1. Check out the release commit and confirm Node.js 22.
2. Run `npm ci`.
3. Configure the three public application variables in the hosting project.
4. In Supabase Auth, set the production Site URL, exact locale callback URLs,
   production SMTP, and leaked-password protection.
5. Apply the ordered migrations with the linked Supabase project using
   `npx supabase db push`.
6. Do **not** run `supabase/seed.sql` against production. Seeding is disabled
   during normal local resets; the file is an explicit local-only opt-in.
7. Run `npm run format:check`, `npm run lint`, `npm run typecheck`,
   `npm test -- --run`, and `npm run build` in CI.
8. Deploy the generated Next.js application.
9. Verify sign-up, sign-in, team setup, fixture creation, result entry, and
   statistics in the deployed origin.

The first 15 migration filenames are aligned with the migration history
already present in the hosted project. This prevents a clean `db push` from
replaying an equivalent schema under a second set of version numbers.

## Local deployment rehearsal

```bash
npm ci
cp .env.example .env.local
npm run supabase:start
npx supabase db reset --local
npm run build
npm run start
```

Open `/en` or `/es` after starting the server. Stop the local Supabase stack
with `npm run supabase:stop` when finished.

## Rollback

Application rollback and database recovery are documented in
[`backup-plan.md`](./backup-plan.md). Never roll back a database by deleting
rows or editing an already-applied migration; use a forward corrective
migration or a verified provider restore.
