# Contributing to Matchday

Thank you for helping improve Matchday, a mobile-first SaaS for managing
amateur football teams. The MVP scope and product decisions are documented in
[`docs/MVP.md`](./docs/MVP.md). Please read the relevant domain documentation
before changing behavior that affects teams, seasons, players, matches,
call-ups, results, statistics, or security.

## Before you start

- Search existing issues and pull requests before opening a new one.
- For bugs, use the [bug report template](./.github/ISSUE_TEMPLATE/bug_report.md)
  and include reproduction steps, locale, device/browser, user role, and
  relevant logs or screenshots.
- Keep changes focused. The repository recommends pull requests below 1,000
  changed lines; the automated size labeler ignores lockfiles and documentation.
- Do not commit secrets, `.env.local`, hosted Supabase credentials, service-role
  keys, database passwords, or production data. Use `.env.example` as the
  starting point for local configuration.

## Development setup

Matchday supports Node.js 22, as pinned by `.node-version` and `package.json`.
Install dependencies and create a local environment:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set the three public variables in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Use only the public Supabase URL and publishable key. Never put a secret or
legacy service-role key in either `NEXT_PUBLIC_*` variable.

The application is available at `/en` and `/es`. A Docker-compatible runtime
is required for the local Supabase stack:

```bash
npm run supabase:start
npx supabase db reset --local
npm run db:types
```

The optional demo seed contains synthetic local data only. Apply it with
`npx supabase db query --local --file supabase/seed.sql`; never run it against a
hosted or production project. Stop the local stack when finished with
`npm run supabase:stop`.

## Project conventions

### Application code

- Follow the existing TypeScript, React, Next.js, and Tailwind patterns.
- Matchday is mobile-first. Check narrow and wide layouts for UI changes and
  include screenshots or a short demo in the pull request when the visual
  behavior changes.
- Prefer accessible names, roles, visible states, and user actions in tests
  over snapshots or implementation details.
- Preserve the application's distinct loading, empty, error, unauthorized,
  not-found, conflict, and offline states.
- Keep user-facing text in the translation files. When adding a key, update
  both [`messages/en.json`](./messages/en.json) and
  [`messages/es.json`](./messages/es.json); the i18n workflow checks key parity.

### Database and Supabase

- Add schema changes as new, ordered files in `supabase/migrations`.
- Do not edit an already-applied migration. Use a corrective forward migration
  for changes to existing schema or production data.
- Preserve tenant isolation, ownership checks, composite relationship
  constraints, lifecycle rules, and least-privilege grants. Do not rely on a
  client-supplied `team_id` for authorization.
- After schema changes, regenerate `types/database.ts` with `npm run db:types`.
- Add or update focused database and RLS tests. Every new tenant-owned table
  needs positive own-tenant coverage and negative foreign-tenant and anonymous
  coverage. See [`docs/security-testing.md`](./docs/security-testing.md).
- Keep the local seed separate from migrations and limited to synthetic data.

## Testing and quality checks

Run the checks relevant to your change before requesting review. The full local
quality set is:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

To generate a coverage report, run:

```bash
npm run test:coverage
```

Database and tenant-isolation changes also require Docker-backed local Supabase
testing:

```bash
npm run test:security
```

This command resets only the local database and rejects hosted Supabase URLs.
It is intentionally separate from `npm test` because it starts real local
Supabase services. If Docker is unavailable, mention that clearly in the pull
request rather than substituting a hosted project.

## Branches, commits, and pull requests

Create a focused branch from `main` with a descriptive name, such as
`feature/match-timeline`, `fix/callup-validation`, or `docs/contributing`.
Use clear, imperative commit subjects and keep unrelated cleanup out of the
branch.

When opening a pull request:

1. Explain what changed and why.
2. Link the related issue or ticket, or state `N/A`.
3. Select the applicable change types in the pull request template.
4. Describe automated and manual verification, including the exact commands
   run.
5. Call out database migrations, RLS/security impact, translation changes,
   mobile behavior, screenshots, and any known limitations.
6. Confirm that applicable CI checks pass and that the change remains focused.

The pull request template contains the complete checklist. CI runs formatting,
linting, typechecking, Vitest coverage, and a production build. Changes to
Supabase/security files also run the local security suite, while changes to
`messages/` or `i18n/` run the English/Spanish key-parity check.

## Security issues

Please do not disclose suspected vulnerabilities, tenant-isolation bypasses,
credential exposure, or production-data issues in a public issue. Contact the
repository maintainers privately with a concise description, affected files or
routes, reproduction steps, impact, and a suggested safe fix. Do not include
real user data or credentials in the report.

## Further reading

- [README](./README.md) — local development and common commands
- [Testing strategy](./docs/testing-strategy.md) — test philosophy and coverage
- [Database schema](./docs/database.md) — relationships, constraints, and lifecycle rules
- [Security model](./docs/security.md) — authorization and tenant isolation
- [Security testing](./docs/security-testing.md) — local RLS suite and fixtures
- [Deployment guide](./docs/deployment.md) — release and hosted-environment operations
