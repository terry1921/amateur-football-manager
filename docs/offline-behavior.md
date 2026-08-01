# Offline behavior

## Detection and shell

`components/feedback/use-online-status.ts` subscribes to the browser
`online`/`offline` events using `useSyncExternalStore`, avoiding hydration
mismatches. `OfflineBanner` is rendered from the locale layout, so it covers
auth, onboarding, and protected screens. It is safe-area aware through the
existing mobile shell and announces the state politely.

The production service worker (`public/sw.js`) caches only the offline shell,
icon, and same-origin static assets. Navigation is network-first and falls
back to `public/offline.html`. It does not present cached domain data as
current and it does not queue mutations.

## Mutations and drafts

All form submit controls that can change server data are disabled while the
browser is offline. This includes authentication submits, team/season/player
forms, match creation/editing, call-up save, result completion, and lifecycle
actions. Existing in-memory form values and event/call-up selections remain in
the client component; reconnecting does not auto-submit them.

When the connection returns, the banner disappears. The user chooses when to
retry, so a lost response cannot silently complete a match twice.

## Safe retry policy

- Read retries reset/reload the affected route or module.
- Match creation uses `matches.creation_key` plus a team-scoped unique index,
  making an uncertain repeated submission idempotent.
- Result completion uses the atomic RPC and scheduled-state lock; a completed
  match returns a conflict and offers refresh, never a duplicate event set.
- Call-up replacement is an atomic, state-checked RPC.
- No automatic retry, background sync, offline editing, or persistent
  cross-device drafts are implemented in Task 019.

## Manual verification

Browser-level offline simulation remains a release checklist item: enter a
result, switch offline, verify the draft remains, confirm the submit control
is unavailable, reconnect, and explicitly retry. This must be checked on a
reachable production build because the in-app browser cannot currently reach
the local development server in this environment.
