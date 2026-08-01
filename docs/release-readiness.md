# Test release readiness

## Executive summary

Overall testing confidence is **Good** for the MVP domain and security model.
The suite contains 189 unit/component tests, 191 pgTAP tests, and 58 real local
Supabase JS security tests. The audit found no skipped or focused tests, no
snapshot-heavy false confidence, and fixed two genuine result-integrity defects
exposed by the database suite.

Release confidence: **Yes**. The Docker-backed security suite completed
successfully locally; CI should continue running the same gate on schema and
security changes.

## Business-rule evidence

| Rule                                                    | Automated evidence                                  | Status  |
| ------------------------------------------------------- | --------------------------------------------------- | ------- |
| One team per owner and safe onboarding                  | team unique constraint/RLS tests, access tests      | Covered |
| One active season and history protection                | season RPC/pgTAP and JS RLS tests                   | Covered |
| Match scheduling uses eligible owned season             | match action/model tests and RLS                    | Covered |
| Idempotent uncertain match creation                     | unique-key migration and action/error tests         | Covered |
| Call-up only for eligible players and scheduled matches | model, component, RPC, pgTAP, RLS tests             | Covered |
| Completed matches are immutable                         | trigger, lifecycle, RLS and UI tests                | Covered |
| Goals equal managed-team score                          | result form, RPC, rollback, RLS tests               | Covered |
| Result plus normalized events is atomic                 | RPC and rollback integration tests                  | Covered |
| Statistics are projections, not stored totals           | statistics SQL and model tests                      | Covered |
| Call-up is not appearance                               | player statistics SQL/model tests                   | Covered |
| Leaderboard ties and filters                            | model and component tests                           | Covered |
| Timeline ordering and stoppage time                     | timeline model tests                                | Covered |
| Social content uses recorded data                       | social model/data/export/component tests            | Covered |
| Offline and error states remain distinct                | offline banner, dashboard/error mapping, form tests | Partial |

## Regression protection

| Previous risk or defect                                     | Regression test                                         | Result                          |
| ----------------------------------------------------------- | ------------------------------------------------------- | ------------------------------- |
| Result submission showed an ambiguous generic failure       | error mapping, result action, RPC/RLS tests             | Covered                         |
| Goal score could disagree with persisted events             | result form plus database reconciliation/rollback tests | Covered                         |
| Timeline metadata was rejected by the hardened result RPC   | pgTAP result-event fixture with stoppage time and notes | Fixed and covered               |
| Direct table completion bypassed the transaction            | result-entry trigger and match RLS tests                | Covered                         |
| Missing transaction guard setting allowed direct completion | pgTAP and authenticated Data API assertions             | Fixed and covered               |
| Retrying match creation could duplicate fixtures            | creation key migration/action tests                     | Covered                         |
| Call-up replacement could partially mutate                  | atomic RPC and rollback tests                           | Covered                         |
| Cross-tenant UUID/filter/nested-query access                | authenticated RLS suite                                 | Covered in CI/local environment |
| Security helper had unnecessary definer privileges          | pgTAP function privilege test                           | Covered                         |
| Authenticated ACLs retained non-API privileges              | pgTAP grant test                                        | Covered                         |

## CI review

The main workflow runs format, lint, typecheck, the full Vitest coverage suite,
uploads the coverage artifact, and builds Next.js. A separate workflow runs
the local Supabase security suite on migration/security changes. Both workflows
use Node 22, npm caching, read-only repository permissions, and bounded job
timeouts.

The principal weakness is that the security workflow is separate from the
main quality job and only path-triggered. Keep it required for pull requests
that change schema, auth, actions, or security-sensitive data access. A future
improvement is a small browser smoke job for the three critical user journeys.

## Verification record

Passed:

- `npm test -- --run`: 50 files, 189 tests.
- `npm run test:coverage`: 50 files, 189 tests; report generated.
- `npm run format:check`.
- `npm run lint`.
- `npm run typecheck`.
- `npm run build`.
- `npm audit --json` and `npm audit --omit=dev --json`: zero vulnerabilities.

Environment-blocked:

- `npm run test:security`: pgTAP 191/191 and Supabase JS/RLS 58/58 passed.

Not implemented by design:

- Browser/E2E, cross-browser, real-device, load, chaos, and performance tests.
- Automated axe accessibility scan.
- Production observability and rate-limit validation.

## Release decision

The project has sufficient maintainable automated coverage of the critical
business rules, database authorization boundaries, and historical regressions
for an MVP deployment. Approve release after the CI security job is green; do
not use the global coverage percentage as a substitute for that gate.
