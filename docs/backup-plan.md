# Backup and recovery plan

No backup service is implemented by the application. Backups are an operator
responsibility in the hosted Supabase and deployment providers.

## Database

- Enable and verify the Supabase project's scheduled backups and point-in-time
  recovery appropriate to the production plan.
- Before a release migration, record the current migration version and create a
  provider snapshot where available.
- Keep migration files and release commits immutable and recoverable in source
  control.
- Test restoring a non-production branch or project before relying on a
  recovery procedure.

## Storage

The RC1 MVP has no application Storage buckets or upload paths. If Storage is
introduced later, configure bucket-level ownership policies and include object
backup/restore verification in the release gate before enabling uploads.

## Environment

- Keep hosting and Supabase secrets in managed secret storage.
- Record variable names, not values, in deployment documentation.
- Rotate publishable or provider credentials through their normal dashboards;
  never commit replacement secrets to the repository.

## Recovery procedure

1. Pause new deployments and record the incident time and release identifier.
2. Roll the application back to the last known-good deployment.
3. If data integrity is affected, stop writes where practical and restore the
   database to a verified point or apply a corrective forward migration.
4. Re-run the security, result-integrity, and smoke checks.
5. Resume traffic only after the restored application and database versions are
   compatible.
6. Document the incident and preserve the failed release for investigation.
