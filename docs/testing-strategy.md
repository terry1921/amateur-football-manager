# Testing strategy

## Philosophy

Confidence is the goal; coverage is evidence, not the goal itself. A test is
worth keeping when it protects a business rule, a tenant boundary, a user
workflow, or a previously observed failure. Cosmetic markup and framework
internals are deliberately not used to inflate the number.

The test pyramid for this MVP is:

```text
                  A few browser/E2E flows (not yet automated)
             Component behavior and accessibility-oriented assertions
          Domain/unit tests + database/RLS integration tests
```

## Risk-based priorities

| Area                          | Risk     | Required confidence                                                                        |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| Authentication and sessions   | Critical | Schema, safe redirects, access routing, local Auth clients in security setup               |
| RLS and tenant authorization  | Critical | Positive/negative CRUD, IDOR, filters, nested queries, anonymous access, row movement      |
| Result entry and events       | Critical | Atomic completion, immutability, goal reconciliation, call-up membership, rollback         |
| Statistics and player history | Critical | Derived projections, season/career scope, participation semantics, aggregation correctness |
| Matches, call-ups, seasons    | High     | Lifecycle, validation, ownership, idempotency, history preservation                        |
| Players and teams             | High     | Validation, ownership root, inactive history, unique identifiers                           |
| Leaderboards                  | High     | Ranking, ties, filters, empty states, source projection                                    |
| Dashboard                     | Medium   | Query composition, progress dependencies, partial failure and empty states                 |
| Social generator              | Medium   | Deterministic content, safe fallbacks, canvas export behavior                              |
| Mobile/PWA and navigation     | Medium   | Safe-area/overflow contracts, install/offline shell, primary navigation                    |
| Styling and animation         | Low      | Manual review only unless it changes interaction or accessibility                          |

## What is covered

### Unit and domain tests

Domain tests cover validation, timezone conversion, managed-team score
orientation, match lifecycle rules, call-up filtering, setup progress,
timeline ordering, statistics projections, leaderboard ties, social content,
safe redirects, error classification, and environment safety.

### Component tests

Behavior tests cover the dashboard, match management filters and empty states,
call-up editor, result reconciliation, leaderboards, social generator,
navigation, install prompt, offline banner, player forms, and lifecycle
controls. Assertions prefer accessible roles, visible state, links, and user
actions over snapshots.

### Database and security integration

The pgTAP suite covers schema invariants, lifecycle triggers, atomic RPCs,
statistics, player history, policies, grants, indexes, and RLS metadata. The
Supabase JS suite creates separate authenticated users and checks own-tenant
success plus foreign-tenant, anonymous, manipulated-filter, nested-query,
bulk-operation, and relationship-integrity failures.

## Regression policy

Every confirmed production or audit defect must have a regression assertion at
the narrowest reliable boundary:

- result failures: database transaction/RLS test plus client boundary test;
- duplicate uncertain submissions: unique constraint/idempotency test;
- tenant leaks: authenticated cross-tenant API test;
- error-state ambiguity: error-code mapping and component-state test;
- security hardening: pgTAP metadata/grant/function test.

Tests must assert the observable invariant, not an incidental implementation
detail or raw backend wording.

## Test doubles, fixtures, and maintainability

Mocks are limited to navigation, Supabase SSR construction, and external
statistics reads where a component needs deterministic inputs. Domain rules are
not mocked. Security fixtures are deterministic per namespace, use real local
Auth sessions, and keep admin setup separate from authorization assertions.

The audit found no skipped tests, focused tests, snapshots, or unused fixture
module. No duplicate suite was removed because the overlapping tests protect
different layers (database enforcement versus client behavior).

## Standard commands

```bash
npm test
npm run test:coverage
npm run test:security
npm run format:check
npm run lint
npm run typecheck
npm run build
```

`npm run test:security` is local-only by design and must run in Docker or CI;
it must never target a hosted project.

## Intentional boundaries

There is no browser automation, axe-based accessibility runner, load test,
cross-browser matrix, real-device test, or production observability test in
the MVP. These are documented release risks rather than hidden coverage.
