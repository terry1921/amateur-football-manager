begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name in ('price', 'price_id', 'amount')
  ),
  'subscription rows expose no client-supplied price or amount field'
);

insert into auth.users (id, email)
values
  ('03000000-0000-0000-0000-000000000001', 'billing-security-owner-a@example.test'),
  ('03000000-0000-0000-0000-000000000002', 'billing-security-owner-b@example.test');

insert into public.teams (id, owner_id, name, slug)
values
  ('13000000-0000-0000-0000-000000000001', '03000000-0000-0000-0000-000000000001', 'Billing Security Team A', 'billing-security-team-a'),
  ('13000000-0000-0000-0000-000000000002', '03000000-0000-0000-0000-000000000002', 'Billing Security Team B', 'billing-security-team-b');

insert into public.subscriptions (
  id, team_id, plan, status, provider, provider_subscription_id, current_period_end
)
values (
  '23000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  'pro',
  'active',
  'security-test-provider',
  'security-subscription-a',
  '2026-09-01T00:00:00.000Z'
);

select set_config('request.jwt.claim.sub', '03000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  (select count(*) from public.subscriptions where id = '23000000-0000-0000-0000-000000000001'),
  1::bigint,
  'an owner can see their subscription without gaining write access'
);
select is(
  (select count(*) from public.subscriptions where team_id = '13000000-0000-0000-0000-000000000002'),
  0::bigint,
  'a known foreign team ID does not reveal its subscription'
);
select throws_ok(
  $$insert into public.subscriptions (team_id, plan, status) values ('13000000-0000-0000-0000-000000000001', 'pro', 'active')$$,
  '42501', null,
  'an authenticated owner cannot create a Pro subscription'
);
select throws_ok(
  $$update public.subscriptions set plan = 'free' where id = '23000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'an authenticated owner cannot manipulate the stored plan'
);
select throws_ok(
  $$update public.subscriptions set status = 'canceled', cancel_at_period_end = true where id = '23000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'an authenticated owner cannot cancel or mutate a subscription directly'
);
select throws_ok(
  $$insert into public.billing_events (provider, provider_event_id, event_type, team_id) values ('security-test-provider', 'forged-event', 'customer.subscription.updated', '13000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'an authenticated caller cannot forge a provider event'
);

reset role;
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;

select throws_ok(
  $$insert into public.subscriptions (team_id, plan, status) values ('13000000-0000-0000-0000-000000000002', 'enterprise', 'active')$$,
  '23514', null,
  'unsupported plan values are rejected even on trusted writes'
);
select throws_ok(
  $$insert into public.subscriptions (team_id, plan, status, provider, provider_subscription_id) values ('13000000-0000-0000-0000-000000000002', 'pro', 'active', 'security-test-provider', 'security-subscription-a')$$,
  '23505', null,
  'a provider subscription cannot be assigned to a foreign team'
);
select lives_ok(
  $$insert into public.billing_events (provider, provider_event_id, event_type, team_id) values ('security-test-provider', 'provider-event-once', 'customer.subscription.updated', '13000000-0000-0000-0000-000000000001')$$,
  'the trusted processor can record the provider event once'
);
select throws_ok(
  $$insert into public.billing_events (provider, provider_event_id, event_type, payload) values ('security-test-provider', 'provider-event-sensitive-payload', 'customer.subscription.updated', '{"customer_email":"member@example.test"}')$$,
  '23514', null,
  'a billing event payload cannot retain customer data'
);
select throws_ok(
  $$insert into public.billing_events (provider, provider_event_id, event_type, team_id) values ('security-test-provider', 'provider-event-once', 'customer.subscription.updated', '13000000-0000-0000-0000-000000000001')$$,
  '23505', null,
  'a replayed provider event is rejected by the idempotency key'
);
select lives_ok(
  $$update public.subscriptions set status = 'past_due' where id = '23000000-0000-0000-0000-000000000001'$$,
  'the trusted processor retains the controlled state transition path'
);

reset role;
select * from finish();
rollback;
