# Matchday v1.0.0-rc.1

Release candidate for evaluation by real amateur football teams.

## What is included

The release covers the complete MVP matchday loop:

```text
Sign up → team → season → players → fixture → call-up → result/events
       → derived statistics → leaderboards → social-ready copy
```

The database is the source of truth for completed matches and normalized match
events. Result recording is a single transaction; failed submissions leave the
match and its events unchanged.

## Release decision

The candidate is suitable for controlled beta evaluation once the operator-only
conditions in [`docs/release-checklist.md`](./docs/release-checklist.md) are
confirmed in the target hosting and Supabase projects. This repository does
not contain production credentials and no hosted deployment is claimed from a
local verification run.

## Improvements

- Strong tenant isolation and protected historical records.
- Safe retry behavior for match and team creation.
- Distinct loading, empty, error, unauthorized, not-found, conflict, and
  offline states.
- Mobile/PWA shell with offline fallback and install prompt.
- CI checks for formatting, linting, types, tests, coverage, i18n parity, and
  production build.

## Known limitations

- Configure Supabase leaked-password protection before public sign-up.
- Configure production SMTP, Auth redirect URLs, and the canonical site URL.
- Perform a real deployment smoke test, keyboard/screen-reader pass, viewport
  matrix, and performance spot check against the chosen hosting environment.
- Storage upload is intentionally deferred; no Storage bucket or policy is
  required by the current MVP.

## Post-RC roadmap

- **v1.0.0:** graduate the RC after pilot feedback and operator gates.
- **v1.1:** notifications, sponsors, and richer match communication.
- **v1.2:** video highlights, multi-team support, AI captions, and league
  management evaluation.
