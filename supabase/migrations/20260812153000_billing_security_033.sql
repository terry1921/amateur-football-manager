-- Security review 033: retain no provider payload. Active/trialing Pro rows
-- without a period end fail closed in the entitlement resolver; this migration
-- preserves the established trusted-write contract while removing raw events.
-- Remove legacy arbitrary payloads before enforcing the minimized schema.
update public.billing_events
set payload = '{}'::jsonb
where payload <> '{}'::jsonb;

alter table public.billing_events
  add constraint billing_events_payload_minimized_check
  check (payload = '{}'::jsonb);
