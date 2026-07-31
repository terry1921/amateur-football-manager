# First-time experience

The dashboard guides an authenticated owner after team creation without adding
a blocking wizard or a second onboarding status. Setup is always derived from
the owner's real, RLS-visible records.

## Dashboard states

- **New team:** the welcome panel, next recommendation, progress, and expanded
  checklist lead the page. Dashboard modules explain their empty state.
- **Partial setup:** completed steps become secondary, the first incomplete step
  remains the recommendation, and real season/player/match data replaces the
  corresponding empty state automatically.
- **Operational team:** when a season, at least one player, and a match exist,
  operational modules move first and setup becomes a collapsed disclosure.
- **Complete setup:** the disclosure reads `Setup complete`; no completion flag
  is stored.
- **Query failure:** the page renders a retryable error state. Failed queries are
  never interpreted as zero records.

## Step rules

| Step    | Authoritative completion rule     | Dependency         |
| ------- | --------------------------------- | ------------------ |
| Team    | Earliest owned team exists        | Authenticated user |
| Season  | At least one season exists        | Team               |
| Players | At least one player exists        | Team               |
| Match   | At least one match exists         | Season             |
| Call-up | At least one call-up exists       | Player and match   |
| Result  | A completed match has both scores | Match              |

Any valid season counts for first-time progress. An active season is preferable
for normal operations, but a draft season still proves that the creation step
was completed. The dashboard's season module separately reports whether an
active season exists.

Progress is `completed steps / 6`, rounded to a whole percentage. The next
recommendation is the first incomplete step in product order. Dependencies and
feature availability are separate: a step can be logically next while its CRUD
screen is still marked as upcoming. The call-up step is available once players
and a match exist.

> A setup step must be marked complete only when completion can be verified
> from authoritative application data.

## Query and tenancy rules

V1 consistently uses the earliest team owned by the authenticated user. This is
the temporary current-team rule until a future team-selection feature exists.
The dashboard resolves the active season once, then issues parallel,
team-scoped head counts for setup and player availability plus bounded fixture
and history reads. Visible upcoming fixture IDs are followed by one batched,
bounded call-up lookup; there is no per-card call-up query or full collection
load. See [`dashboard.md`](./dashboard.md) for the complete operational read
model.

The team ID originates from the authenticated server-side ownership lookup. It
is never accepted from the browser. All queries use the publishable-key server
client with the user's cookie-backed session and remain subject to RLS.

## Empty-state convention

Every empty state names what is missing, explains why it matters, and gives the
next relevant action. An action stays visibly unavailable with a Task label
until its route performs real work. Empty states must not use `No data` or link
to fake forms.

## Future task integration

Feature availability is recorded beside the step definitions in
`features/dashboard/progress.ts`. Later tasks should activate a CTA only when
its destination is functional:

- Task 007 creates a season; the existing season query becomes true.
- Task 008 creates a player; `playerCount > 0` becomes true.
- Task 009 provides the real match scheduler; its CTA is active when a season
  exists, and the match-existence query becomes true after scheduling.
- Task 010 provides the match call-up manager; the call-up query becomes true
  after the first saved selection. The upcoming-match card shows a ready count
  when at least one player is selected and an incomplete prompt otherwise.
- Task 012 records a valid completed score; the result query becomes true.

No task should write a manual onboarding step. To add a future setup step, add
one typed definition with an authoritative completion query, meaningful
dependencies, localized copy, and progress/dependency/tenant-isolation tests.

Recommended future analytics events are `dashboard_viewed`,
`setup_step_cta_clicked`, `setup_completed`, and `empty_state_cta_clicked`.
No analytics dependency or sensitive payload was added in this task.
