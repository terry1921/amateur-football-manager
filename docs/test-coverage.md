# Test coverage review

## Measurement

Coverage is generated with Vitest V8 using `npm run test:coverage`. The report
includes application, component, feature, and library source files, while
excluding test files, type declarations, and framework loading/error shells.
The HTML, LCOV, and JSON summary are written to the ignored `coverage/`
directory.

Fresh baseline after the Task 021 additions:

| Metric     | Covered | Total | Percent |
| ---------- | ------: | ----: | ------: |
| Statements |   1,030 | 2,388 |  43.13% |
| Branches   |     829 | 2,106 |  39.36% |
| Functions  |     381 |   688 |  55.37% |
| Lines      |     963 | 2,171 |  44.35% |

The global figure is intentionally not a release gate. It includes server
actions and route pages that are better validated through database integration
or a small E2E set than through large mock-heavy unit tests.

## Coverage by feature

| Area                 | Statements | Branches | Functions | Lines | Risk     |
| -------------------- | ---------: | -------: | --------: | ----: | -------- |
| Authentication       |       9.9% |     0.0% |     18.8% | 10.5% | Critical |
| Teams                |      38.4% |    52.7% |     58.8% | 40.3% | High     |
| Seasons              |       7.2% |     9.1% |     19.4% |  7.8% | High     |
| Players              |      32.5% |    36.1% |     42.2% | 34.2% | High     |
| Matches              |      41.0% |    31.7% |     51.4% | 42.3% | High     |
| Call-ups             |      53.6% |    50.8% |     83.1% | 57.2% | High     |
| Results/events       |      45.7% |    34.0% |     56.8% | 47.7% | Critical |
| Statistics           |      19.5% |    19.9% |     30.7% | 20.3% | Critical |
| Leaderboards         |      91.9% |    69.8% |     96.7% | 95.0% | High     |
| Dashboard            |      60.2% |    62.1% |     81.8% | 60.6% | Medium   |
| Social generator     |      68.8% |    56.7% |     73.8% | 70.6% | Medium   |
| Timeline             |      78.1% |    54.2% |     68.6% | 77.6% | Medium   |
| Components           |      81.2% |    85.7% |     71.0% | 81.5% | Medium   |
| Error/auth libraries |      71.9% |    61.1% |     72.7% | 71.7% | Critical |

Coverage is uneven in the expected direction: pure domain models and UI
behavior are well exercised, while server actions and data loaders have low
direct unit coverage but are partly protected by RLS/database integration.

## Meaningful improvements made

- Added transaction-boundary failure propagation coverage for result entry.
- Added malformed JSON, strict-object, and maximum-event payload coverage.
- Added duplicate-submission, score-reconciliation, call-up lifecycle, and
  permission error classification coverage.
- Fixed a confirmed result RPC regression: timeline `stoppage_time` and
  `notes` are now accepted and persisted by the same atomic transaction.
- Fixed a confirmed direct-completion bypass when the transaction-local guard
  setting was absent; the guard now treats an unset setting as unauthorized.
- Added a first-class coverage command and CI artifact upload so the report is
  generated and retained on every quality run.
- Fixed a high development-dependency audit finding in `brace-expansion`; both
  full and production npm audits are now clean.

## Threshold policy

The requested 90/85/90/90 thresholds are useful targets for critical pure
domain modules, not a global gate. Recommended policy:

| Scope                         |            Statements |              Branches |             Functions |                 Lines |
| ----------------------------- | --------------------: | --------------------: | --------------------: | --------------------: |
| Critical pure domain modules  |                   90% |                   85% |                   90% |                   90% |
| High-risk pure domain modules |                   85% |                   75% |                   85% |                   85% |
| UI and route composition      | Report only initially | Report only initially | Report only initially | Report only initially |

The current pipeline reports coverage but does not fail the build on a global
percentage. A threshold should be enforced only after the critical-module
include list is explicit and the database suite runs reliably in CI.

## False confidence and gaps

- `npm test` does not include the Docker-backed Supabase suite; a green unit
  run alone does not prove tenant isolation.
- No automated browser flow covers register → team → player or match → result
  → statistics end to end.
- Accessibility is asserted through roles, labels, focusable controls, and
  visible states, but no automated axe scan exists.
- Server actions have deliberately low direct coverage. Their most important
  authorization and transaction rules are tested at the database boundary;
  action-level error translation remains a future high-value target.
- No performance tests measure statistics, leaderboards, or canvas exports.
