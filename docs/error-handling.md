# Error handling and resilience

Task 019 uses a small application error taxonomy so backend details do not
become presentation logic. The UI distinguishes state by the operation that
failed, not by whether a string happens to contain “error”.

## Taxonomy

| Category        | Example codes                                                                     | User behavior                                                   | Retryable                         | Logging severity |
| --------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------- | ---------------- |
| Validation      | `GOAL_COUNT_MISMATCH`, `PLAYER_NOT_IN_CALLUP`                                     | Keep the form and show field/form guidance                      | No, correct input                 | warning          |
| Authentication  | `AUTH_SESSION_EXPIRED`, `AUTH_INVALID_CREDENTIALS`                                | Show safe sign-in guidance; preserve only in-memory form values | Session refresh/sign-in           | warning          |
| Authorization   | `AUTH_UNAUTHORIZED`                                                               | Explain that the account cannot perform this operation          | No blind retry                    | warning          |
| Not found       | `PLAYER_NOT_FOUND`, `MATCH_NOT_FOUND`, `SEASON_NOT_FOUND`                         | Show resource-specific not-found page and safe return link      | Read refresh only                 | info             |
| Conflict        | `MATCH_ALREADY_COMPLETED`, `MATCH_DUPLICATE_SUBMISSION`, `DUPLICATE_SHIRT_NUMBER` | Explain the current state; refresh or correct the input         | Only after revalidation           | warning          |
| Network/offline | `NETWORK_UNAVAILABLE`, `OFFLINE`                                                  | Keep drafts, disable saves, show reconnect/offline guidance     | Reads and explicit mutation retry | warning          |
| Database        | `MIGRATION_MISSING`, `STATISTICS_UNAVAILABLE`                                     | Show a safe operation-specific failure                          | Read-only retry where safe        | error            |
| Export          | `EXPORT_FAILED`                                                                   | Keep the preview and offer an explicit export retry             | Yes                               | warning          |
| Unexpected      | `UNEXPECTED_ERROR`                                                                | Generic safe error state with reset/navigation                  | Only for reads                    | error            |

`AppError` in `lib/errors/error-codes.ts` carries category, stable code,
recoverability, retryability, optional field errors, and an internal cause.
Causes are never serialized into the browser or rendered to users.

## Backend mapping

`lib/errors/map-backend-error.ts` centralizes mapping for PostgREST,
PostgreSQL/RPC, Supabase Auth, and browser/network failures:

- `PGRST116` and `P0002` become safe not-found codes scoped to the operation.
  Foreign records therefore do not reveal their existence.
- `42501` remains an explicit authorization error so permission failures are
  not confused with missing resources.
- `23505` maps shirt-number conflicts and the match-creation idempotency index
  to stable conflict codes.
- `55000` maps completed-match and read-only call-up state conflicts.
- `23503` during call-up/result work maps to a safe player eligibility error.
- `22023` identifies goal reconciliation and season activation conflicts.
- `PGRST202`/`42883` identifies a missing deployed migration.
- Fetch/network failures map to retryable `NETWORK_UNAVAILABLE`.

UI action states can carry the stable `errorCode` and `retryable` flag while
continuing to use localized messages from `messages/en.json` and
`messages/es.json`.

## Boundaries and privacy

- `app/global-error.tsx` is the last-resort boundary.
- `app/[locale]/error.tsx` handles locale-level failures.
- `app/[locale]/(dashboard)/error.tsx` handles dashboard routes; players,
  matches, and seasons retain their more specific route boundaries.
- Resource not-found boundaries exist for player, match, and season detail
  segments.
- Error boundaries log only operation, stable code/category, digest, and safe
  IDs through `lib/errors/log-error.ts`. No SQL, tokens, passwords, stack
  traces, reset links, or raw Supabase payloads are rendered.

## Mutation rules

Validation errors stay near fields. Form-level errors use
`FormErrorSummary`, focus the summary, and preserve the draft. Conflict errors
do not silently overwrite newer state. Read retries are safe; mutation retries
are explicit and either revalidate state or use an idempotency boundary.

The result RPC remains the transaction boundary: score, events, reconciliation,
and match completion commit together or not at all. Match update/cancel actions
use scheduled-state predicates. Call-up replacement remains an atomic RPC.
Match creation now carries a client-generated `creation_key`, unique per team,
so an uncertain retry cannot create a second fixture. Team onboarding also has
a unique owner invariant.

Contributors must never convert a failed query into `[]`, `0`, or a legitimate
empty state. Every new domain error must be mapped to a stable code before it
reaches a component.

## Route audit matrix

| Route                                 | Loading                   | Empty                                    | Error                                   | Not found                 | Unauthorized                  | Offline                    | Retry/recovery                     |
| ------------------------------------- | ------------------------- | ---------------------------------------- | --------------------------------------- | ------------------------- | ----------------------------- | -------------------------- | ---------------------------------- |
| `/login`, `/register`                 | form pending              | n/a                                      | field/form                              | n/a                       | redirects authenticated users | banner; submit disabled    | explicit submit                    |
| `/forgot-password`, `/reset-password` | form pending              | n/a                                      | safe auth message                       | n/a                       | protected reset state         | banner; submit disabled    | explicit submit                    |
| `/onboarding`                         | form pending              | n/a                                      | field/form                              | n/a                       | redirects to sign-in          | banner; submit disabled    | explicit submit; owner uniqueness  |
| `/dashboard`                          | route skeleton            | dashboard empty modules                  | route boundary + partial module errors  | n/a                       | protected layout redirect     | banner; saves disabled     | read refresh/module link           |
| `/seasons`, `/seasons/new`            | route/form skeleton       | no seasons                               | segment error/form error                | n/a                       | protected layout redirect     | banner; saves disabled     | safe read retry/form retry         |
| `/seasons/[seasonId]`                 | detail skeleton           | no linked matches                        | segment error                           | season not-found          | protected layout redirect     | banner                     | return to seasons/read refresh     |
| `/players`, `/players/new`            | route/form skeleton       | no players/filtered empty                | segment error/form error                | n/a                       | protected layout redirect     | banner; saves disabled     | safe read retry/form retry         |
| `/players/[playerId]`                 | detail skeleton           | no history                               | segment error                           | player not-found          | protected layout redirect     | banner                     | return to players/read refresh     |
| `/matches`, `/matches/new`            | route/form skeleton       | no fixtures/filtered empty               | segment error/form error                | n/a                       | protected layout redirect     | banner; saves disabled     | safe read retry/form retry         |
| `/matches/[matchId]`                  | detail skeleton           | no events/call-up                        | segment error                           | match not-found           | protected layout redirect     | banner                     | return to matches/read refresh     |
| `/matches/[matchId]/call-up`          | inherited detail skeleton | no call-up/available players             | form/segment error                      | inherited match not-found | protected layout redirect     | banner; save disabled      | explicit replacement after refresh |
| `/matches/[matchId]/result`           | inherited detail skeleton | no events / valid 0–0                    | form/segment error                      | inherited match not-found | protected layout redirect     | banner; save disabled      | explicit retry; conflict refresh   |
| `/statistics`, `/leaderboards`        | statistics skeleton       | no completed matches/no filtered players | dashboard segment boundary              | n/a                       | protected layout redirect     | banner                     | read refresh only                  |
| `/social`                             | social skeleton           | no eligible match/assets                 | dashboard segment boundary/export error | n/a                       | protected layout redirect     | banner; local export retry | explicit export retry              |

An inherited entry means the nearest dynamic or dashboard segment boundary is
the owner of the state; it is not an unhandled case.

## Mutation audit matrix

| Mutation                          | Pending state                     | Duplicate protection                              | Input preserved           | Conflict handling                                  | Success feedback                    |
| --------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------- | -------------------------------------------------- | ----------------------------------- |
| Register/login/reset              | contextual submit + `aria-busy`   | pending button                                    | yes                       | safe Auth mapping                                  | redirect or inline confirmation     |
| Create team                       | contextual submit                 | unique `teams.owner_id` invariant                 | yes                       | concurrent owner retry redirects safely            | dashboard redirect                  |
| Create/update/activate season     | contextual submit/lifecycle state | pending + RPC/unique season invariants            | yes                       | duplicate/history/active-season codes              | route revalidation/redirect         |
| Create/update/status player       | contextual submit/lifecycle state | pending + RLS/status predicates                   | yes                       | duplicate shirt/not-found codes                    | notice redirect                     |
| Create/update/cancel/delete match | contextual submit/dialog pending  | creation key; scheduled-state predicates          | yes                       | history/not-found codes                            | notice redirect                     |
| Save call-up                      | contextual pending state          | atomic replacement RPC                            | selected IDs retained     | read-only/player eligibility codes                 | saved notice                        |
| Complete result/events            | contextual pending state          | atomic RPC + scheduled lock + goal reconciliation | score/events retained     | completed/cancelled/not-in-call-up codes + refresh | result notice after commit          |
| Export social image               | export progress/error state       | explicit client invocation                        | preview/template retained | safe export fallback/error                         | only after successful blob download |
