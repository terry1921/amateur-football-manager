# Task 022 — RC1 completion report

Date: 2026-08-01
Version: `v1.0.0-rc.1`

## 1. Executive summary

The repository is release-candidate ready for controlled evaluation. The
application builds, the standard and database security suites pass, the local
demo seed is valid, the production server responds, and the release/rollback
documentation is present.

Recommendation: **Approve with Conditions**.

The remaining conditions are operator-owned: complete a real hosting deploy,
enable Supabase leaked-password protection, configure production SMTP/Auth
redirects, and perform the manual deployed-origin accessibility and smoke pass.
No production credentials or hosting project were available in this workspace,
so those external actions are not claimed as completed.

## 2. Release checklist

| Item          | Status                          | Notes                                                                                                         |
| ------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Build         | Pass                            | Next.js 16.2.12 production build; 38 routes generated.                                                        |
| Tests         | Pass                            | 51 files, 192 unit/component tests.                                                                           |
| Security      | Pass with condition             | 191 pgTAP and 58 Supabase JS/RLS tests pass; Supabase still reports leaked-password protection disabled.      |
| Performance   | Review complete                 | Bounded query/index design reviewed; no load test exists.                                                     |
| Accessibility | Partial/manual gate             | Semantic DOM and viewport checks pass; keyboard/screen-reader check remains required on the deployed origin.  |
| Documentation | Pass                            | README, deployment, release, backup, security, testing, and domain docs are present.                          |
| Deployment    | Local rehearsal pass            | `next start` returned 200 for `/en` and `/manifest.webmanifest`; hosted deployment is not verified.           |
| PWA           | Pass in code/manual shell check | Manifest, icon, service worker, offline shell, theme colors, and install prompt are covered.                  |
| Mobile        | Pass for layout smoke           | No horizontal overflow at all requested widths.                                                               |
| Seed data     | Pass                            | Explicit local seed produced 1 team, 1 season, 8 players, 1 completed match, 1 scheduled match, and 4 events. |

## 3. Build verification

- `npm run build`: passed with Next.js 16.2.12, TypeScript, and 38 generated
  routes.
- No build warning or compilation error was emitted.
- The artifact responds under `next start`.
- The build uses the documented public Supabase variables and does not require
  a service-role key in the browser.

## 4. Environment review

The only application runtime variables are:

| Variable                               | Type                 | Purpose                              |
| -------------------------------------- | -------------------- | ------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public               | Supabase API origin.                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public               | Browser-safe Supabase key.           |
| `NEXT_PUBLIC_SITE_URL`                 | Public configuration | Canonical Auth link/redirect origin. |

Node.js 22 is the supported runtime and is declared in `.node-version` and
`package.json`. Supabase CLI access, database passwords, SMTP credentials, and
hosting credentials remain operator-managed secrets.

## 5. Deployment verification

`npm ci` completed after reinstalling dependencies. The local production
rehearsal ran `npm run build`, `npm run start -- --hostname 127.0.0.1`, and
verified HTTP 200 responses for `/en` and `/manifest.webmanifest`.

A hosted Vercel/Supabase deployment was not executed because no hosting project
credentials were present. The exact clean-deployment procedure is in
[`deployment.md`](./deployment.md).

## 6. Database verification

- All 22 ordered migrations apply to a clean local database.
- The first 15 filenames now match the migration versions already recorded by
  the hosted project; SQL content was not changed by the reconciliation.
- RLS, composite foreign keys, history triggers, result RPCs, indexes, and
  grants are covered by the security suite.
- The normal reset intentionally does not load demo rows, preserving security
  fixture determinism.
- The explicit synthetic seed was loaded and its counts verified.
- The hosted project migration list matches the final local migration names.

## 7. Documentation audit

Present and reviewed:

- Product/MVP, onboarding, authentication, database, teams, seasons, players,
  matches, call-ups, results, timeline, statistics, player statistics,
  leaderboards, dashboard, social generator, mobile/PWA, offline behavior,
  loading/error resilience, security, threat model, security testing, testing
  strategy, and coverage review.
- [`CHANGELOG.md`](../CHANGELOG.md),
  [`RELEASE_NOTES_RC1.md`](../RELEASE_NOTES_RC1.md),
  [`deployment.md`](./deployment.md), [`backup-plan.md`](./backup-plan.md),
  and [`release-checklist.md`](./release-checklist.md).

The only documentation gap is provider-specific credentials and dashboard
configuration, which cannot be safely committed and is explicitly listed as an
operator condition.

## 8. Test summary

| Layer                                       | Result                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| Unit/component/regression                   | 51 files, 192 passed                                                     |
| Coverage                                    | 43.32% statements, 39.59% branches, 55.52% functions, 44.57% lines       |
| pgTAP database/RLS                          | 9 files, 191 passed                                                      |
| Supabase JS/RLS                             | 9 files, 58 passed                                                       |
| Accessibility-oriented component assertions | Included in standard suite                                               |
| Browser smoke                               | Local public page, PWA manifest, viewport overflow, console check passed |
| Load/performance automation                 | Not implemented; documented as a non-blocking MVP limitation             |

## 9. Security confirmation

- Authentication and protected route behavior are covered by the security and
  application tests.
- Authorization, RLS, tenant isolation, session boundaries, normalized result
  events, and immutable history are verified.
- Storage is not used by the MVP; no bucket or upload policy is exposed.
- No known Critical vulnerability remains.
- Supabase advisory: leaked-password protection is disabled (WARN/Medium,
  operator configuration gate). Performance advisories are informational unused
  index notices, not release blockers.
- `npm audit --json`: 0 vulnerabilities in the checked dependency tree.

## 10. Known issues

Accepted non-blocking limitations:

- Hosted deployment and production Auth/SMTP setup require operator access.
- Leaked-password protection must be enabled before broad public sign-up.
- Browser E2E, axe, load, cross-browser, and real-device suites are not
  automated in CI.
- Storage uploads and image buckets are intentionally outside the MVP.

These do not alter the existing football domain or data-integrity guarantees,
but the first two must be completed before public traffic.

## 11. Release artifacts

- `CHANGELOG.md`
- `RELEASE_NOTES_RC1.md`
- `docs/release-checklist.md`
- `docs/deployment.md`
- `docs/backup-plan.md`
- `docs/rc1-completion-report.md`
- `LICENSE`

## 12. Rollback strategy

Roll back the application to the last known-good deployment first. For data
issues, restore a provider snapshot/PITR point or apply a forward corrective
migration; never edit an applied migration or delete historical match data.
Re-run security, result-integrity, and smoke checks before reopening traffic.
The full procedure is in [`backup-plan.md`](./backup-plan.md).

## 13. Files changed

- Release metadata/configuration: `.env.example`, `.node-version`,
  `package.json`, `package-lock.json`, `eslint.config.mjs`, `README.md`.
- Release artifacts: `CHANGELOG.md`, `RELEASE_NOTES_RC1.md`, `LICENSE`.
- Release operations: `docs/deployment.md`, `docs/backup-plan.md`,
  `docs/release-checklist.md`, `docs/rc1-completion-report.md`.
- Database release assets: `supabase/config.toml`, `supabase/seed.sql`, and
  the 15 migration filenames reconciled to the hosted history. Migration SQL
  content remains unchanged.

## 14. Commands executed

| Gate                 | Command/result                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Install              | `npm ci` — passed; local shell reported Node 26, while CI/runtime policy is Node 22.        |
| Format               | `npm run format:check` — passed.                                                            |
| Lint                 | `npm run lint` — passed with zero errors/warnings after ignoring generated coverage output. |
| Typecheck            | `npm run typecheck` — passed.                                                               |
| Unit/component       | `npm test -- --run` — 192/192 passed.                                                       |
| Coverage             | `npm run test:coverage -- --reporter=dot` — 192/192 passed and report generated.            |
| Database migrate     | `npm run test:security` clean reset — passed.                                               |
| Seed                 | Explicit local SQL seed — passed with verified counts.                                      |
| Security             | `npm run test:security` — 191 pgTAP + 58 JS/RLS passed.                                     |
| Audit                | `npm audit --json` — 0 vulnerabilities.                                                     |
| Build                | `npm run build` — passed.                                                                   |
| Deployment rehearsal | `npm run start` + local HTTP checks — passed.                                               |
| Browser/mobile       | In-app browser DOM, console, viewport matrix — passed for observed checks.                  |

## 15. Release metrics

| Metric                   | Value                                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| Build status             | Pass                                                                  |
| Test pass rate           | 100% of executed automated suites                                     |
| Coverage                 | 43.32% statements / 39.59% branches / 55.52% functions / 44.57% lines |
| Critical defects         | 0 known                                                               |
| High defects             | 0 known in repository; hosted deployment gates remain external        |
| Documentation completion | Complete for repository-controlled operations                         |
| Deployment verified      | Local rehearsal yes; hosted deployment pending                        |
| Security status          | Automated pass; leaked-password protection pending operator setting   |

## 16. Release decision

Approve RC1 for controlled beta evaluation after the operator completes the
four conditions in the release checklist: hosted deploy, Auth/SMTP setup,
leaked-password protection, and deployed-origin manual accessibility/smoke
checks. If any of those expose a Critical or High defect, create RC2 before
public release.

## 17. Final production statement

Based on the completed code verification, security audit, testing audit,
documentation review, local deployment rehearsal, migration validation, and
seed verification, `v1.0.0-rc.1` is suitable to be tagged and evaluated by real
amateur football teams in a controlled release. It is not honest to claim that
the hosted deployment itself is verified until the operator runs the documented
production procedure.
