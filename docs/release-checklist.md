# v1.0.0-rc.1 release checklist

This checklist is the production gate for RC1. Critical and High findings block
release. Medium and Low findings may be accepted only when documented below.

## Build and source

- [ ] Release version is `1.0.0-rc.1` in `package.json` and lockfile.
- [ ] `npm ci` succeeds from a clean checkout using Node.js 22.
- [ ] `npm run format:check` passes.
- [ ] `npm run lint` passes with no errors or warnings.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes with the production variables configured.
- [ ] No secrets, service-role keys, or private certificates are tracked.

## Database and seed

- [ ] `npx supabase db push` is run against the intended hosted project.
- [ ] A clean local `npx supabase db reset --local` applies all migrations.
- [ ] Constraints, indexes, RLS policies, grants, and RPCs are covered by the
      database/security suite.
- [ ] The explicit local demo seed loads only synthetic Demo United data.
- [ ] Seed is not executed against production.
- [ ] The hosted project has a recent backup before any migration.

## Tests and security

- [ ] Unit/component tests pass.
- [ ] Coverage report is generated and reviewed by risk area.
- [ ] Docker-backed Supabase pgTAP and RLS tests pass.
- [ ] Authentication, authorization, session handling, and tenant isolation
      are verified.
- [ ] Supabase leaked-password protection is enabled.
- [ ] No Critical or High security finding remains.

## Deployment and smoke test

- [ ] Hosting project is configured with the three documented public variables.
- [ ] Supabase production Site URL, callback URLs, SMTP, and Auth settings are
      verified.
- [ ] Deployment from a clean checkout completes.
- [ ] A user can register/sign in and complete onboarding.
- [ ] A user can create a fixture, call up players, record a result, and see
      derived statistics.
- [ ] Retrying a failed/uncertain mutation does not duplicate data.
- [ ] Rollback and post-rollback verification are documented and understood.

## Accessibility, mobile, PWA, and performance

- [ ] Keyboard navigation, focus visibility, labels, contrast, and screen-reader
      landmarks are checked on the deployed origin.
- [ ] Viewports 320, 360, 375, 390, 430, 768, and desktop are checked for
      overflow and reachable actions.
- [ ] Manifest, icon, theme colors, install prompt, and offline shell work.
- [ ] No private authenticated response is cached by the service worker.
- [ ] Statistics, leaderboards, and social export are spot-checked with bounded
      data and no runaway request pattern.

## Release artifacts

- [ ] `CHANGELOG.md`
- [ ] `RELEASE_NOTES_RC1.md`
- [ ] `docs/deployment.md`
- [ ] `docs/backup-plan.md`
- [ ] `docs/release-checklist.md`
- [ ] `LICENSE`
- [ ] README setup and quality commands are current.

## Accepted non-blocking limitations

- Browser E2E, automated axe, load, cross-browser, and real-device suites are
  not automated in CI; the manual checks above remain required.
- Storage upload is intentionally out of scope for the MVP and has no bucket or
  policy to validate.
- A hosting deployment cannot be asserted from this repository without access
  to the operator's hosting project.
