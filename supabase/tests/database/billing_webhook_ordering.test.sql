begin;

create extension if not exists pgtap with schema extensions;

select plan(2);

select has_column(
  'public',
  'subscriptions',
  'provider_updated_at',
  'delayed provider events have a durable ordering timestamp'
);

select has_index(
  'public',
  'subscriptions',
  'subscriptions_provider_updated_at_idx',
  'provider subscription ordering lookup has an index'
);

select * from finish();
rollback;
