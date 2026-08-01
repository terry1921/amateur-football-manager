# Loading, empty, and error states

## State hierarchy

The product uses these conceptual states:

- `loading`: route navigation is waiting for server data; route skeletons
  approximate the destination layout.
- `success`: the request completed and data is available.
- `empty`: a successful query returned no records or no applicable aggregate
  data. Empty copy explains the next useful action.
- `submitting`: a mutation is in flight; the contextual button is disabled and
  exposes `aria-busy`.
- `recoverable_error`: a read or mutation failed without evidence of a partial
  commit. Inputs remain available and the user can retry deliberately.
- `fatal_error`: a route or root boundary cannot render safely; reset and stable
  navigation are offered.
- `not_found`: the requested resource is unavailable or inaccessible; the UI
  does not reveal cross-team existence.
- `unauthorized`: protected layouts redirect to sign-in/onboarding; mutation
  states use `AUTH_SESSION_EXPIRED` rather than a database error.
- `conflict`: the source state changed or a uniqueness/state invariant rejected
  the request; the user gets domain guidance and refresh/revalidation.
- `offline`: the browser has no connection; cached shell remains usable but
  mutation controls are disabled and no mutation is queued or auto-retried.

## Loading strategy

Server-rendered feature data remains the primary path. Route `loading.tsx`
files cover dashboard, players, player detail/forms, matches, match detail and
forms, seasons, season detail/forms, statistics, leaderboards, and social.
There are no artificial delays and no extra client fetch waterfalls. Module
level isolation is used for dashboard statistics: a statistics query failure
renders an actionable module error while next match, squad, and result modules
remain available.

Skeletons are marked as status/busy content with screen-reader labels, use
stable approximate heights, and stop their pulse under reduced motion.

## Empty vs error

An empty state is rendered only after the query succeeds:

- no players / no filtered players;
- no seasons / no active season;
- no matches / no filtered matches;
- no call-up / no available players;
- no upcoming match;
- no completed matches or statistics;
- no goals/cards/events in the selected scope.

A failed query renders an error boundary or module error and never becomes an
empty array or zero statistic. The dashboard explicitly keeps its statistics
module status separate from its successfully loaded modules.

## Accessibility

`FormErrorSummary` provides an assertive live region, focus target, and
keyboard-readable recovery content. Field messages remain associated with
their inputs through `aria-describedby`. Pending buttons expose `aria-busy`;
skeletons have meaningful status labels; retries are real buttons/links; and
reduced motion is respected globally.
