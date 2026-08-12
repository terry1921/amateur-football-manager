-- Tasks 026/027: retain provider event ordering so delayed webhook delivery
-- cannot overwrite newer subscription state.
alter table public.subscriptions
  add column provider_updated_at timestamptz;

create index subscriptions_provider_updated_at_idx
  on public.subscriptions (provider, provider_subscription_id, provider_updated_at desc)
  where provider is not null and provider_subscription_id is not null;
