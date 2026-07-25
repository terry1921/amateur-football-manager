# Matchday

Matchday is a mobile-first SaaS for managing amateur football teams. The MVP scope and product decisions live in [`MVP.md`](./MVP.md).

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The interface is available in English at `/en` and Spanish at `/es`. Requests to `/` are redirected to the best matching supported locale, falling back to English.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

The current root screen is a non-functional product foundation. Authentication, onboarding, Supabase, and team-owned data are intentionally deferred to their dedicated MVP tasks.
