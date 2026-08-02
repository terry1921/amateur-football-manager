# Changelog

All notable changes to Matchday are documented here.

## [1.0.0-rc.1] — 2026-08-01

### Added

- Team, season, player, fixture, call-up, result, match-event, statistics,
  leaderboard, and social-copy workflows.
- English and Spanish locale support.
- Mobile-first navigation, installable PWA manifest, offline shell, and
  resilient loading/error/empty states.
- Local Supabase seed data for a synthetic Demo United team.
- Release operations documentation, CI quality gates, security/RLS tests, and
  rollback/backup procedures.

### Improvements

- Result entry is atomic and reconciles managed-team goals with normalized goal
  events.
- Statistics remain derived projections over completed matches and events.
- Tenant isolation, immutable history, idempotent mutations, and least-privilege
  database grants are enforced by migrations and tests.
- Production dependency audit is clean and the Node.js runtime is pinned to 22.

### Known limitations

- Production deployment, SMTP, and Supabase Auth password-protection settings
  require operator configuration; credentials are intentionally not stored in
  this repository.
- Browser E2E, automated axe scans, load testing, and real-device testing are
  manual release checks rather than CI jobs.
- Storage buckets are not part of the MVP; team/player image upload is not
  enabled.
