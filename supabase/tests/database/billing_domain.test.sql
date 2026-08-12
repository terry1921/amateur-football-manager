begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

select has_table('public', 'subscriptions', 'subscriptions table exists');
select has_table('public', 'billing_events', 'billing events table exists');
select has_index(
  'public',
  'subscriptions',
  'subscriptions_team_status_idx',
  'subscription lookups have a team/status index'
);
select has_index(
  'public',
  'billing_events',
  'billing_events_provider_event_key',
  'provider event ids are idempotent'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.subscriptions'::regclass),
  'subscriptions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.billing_events'::regclass),
  'billing events have RLS enabled'
);
select ok(
  has_table_privilege('authenticated', 'public.subscriptions', 'SELECT')
    and not has_table_privilege('authenticated', 'public.subscriptions', 'INSERT, UPDATE, DELETE'),
  'authenticated users can only read subscriptions'
);
select ok(
  not has_table_privilege('authenticated', 'public.billing_events', 'SELECT, INSERT, UPDATE, DELETE'),
  'authenticated users cannot access billing events'
);

insert into auth.users (id, email)
values
  ('02000000-0000-0000-0000-000000000001', 'billing-owner-a@example.test'),
  ('02000000-0000-0000-0000-000000000002', 'billing-owner-b@example.test');

insert into public.teams (id, owner_id, name, slug)
values
  ('12000000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000001', 'Billing Team A', 'billing-team-a'),
  ('12000000-0000-0000-0000-000000000002', '02000000-0000-0000-0000-000000000002', 'Billing Team B', 'billing-team-b');

insert into public.subscriptions (
  id,
  team_id,
  plan,
  status,
  provider,
  provider_subscription_id
)
values (
  '22000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  'pro',
  'active',
  'test-provider',
  'provider-sub-a'
);

select set_config('request.jwt.claim.sub', '02000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (select plan from public.subscriptions where team_id = '12000000-0000-0000-0000-000000000001'),
  'pro'::text,
  'an owner can read their own plan'
);
select is(
  (select count(*) from public.subscriptions where team_id = '12000000-0000-0000-0000-000000000002'),
  0::bigint,
  'an owner cannot read a foreign team plan'
);
select throws_ok(
  $$insert into public.subscriptions (team_id, plan) values ('12000000-0000-0000-0000-000000000001', 'pro')$$,
  '42501',
  null,
  'an owner cannot directly activate a plan'
);
select throws_ok(
  $$update public.subscriptions set plan = 'free' where team_id = '12000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'an owner cannot directly change a plan'
);
select throws_ok(
  $$insert into public.billing_events (provider, provider_event_id, event_type) values ('test-provider', 'event-a', 'subscription.created')$$,
  '42501',
  null,
  'an owner cannot write billing events'
);

reset role;
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;
select throws_ok(
  $$select id from public.subscriptions$$,
  '42501',
  null,
  'anonymous users cannot read subscriptions'
);

reset role;
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select lives_ok(
  $$insert into public.billing_events (provider, provider_event_id, event_type, team_id) values ('test-provider', 'event-a', 'subscription.created', '12000000-0000-0000-0000-000000000001')$$,
  'the service role can record a billing event'
);
select throws_ok(
  $$insert into public.billing_events (provider, provider_event_id, event_type) values ('test-provider', 'event-a', 'subscription.created')$$,
  '23505',
  null,
  'duplicate provider events are rejected'
);

reset role;
select * from finish();
rollback;
