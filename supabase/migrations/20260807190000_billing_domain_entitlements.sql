-- Task 023: cache team billing state locally and keep entitlement reads provider-independent.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  plan text not null default 'free',
  status text not null default 'active',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_team_id_fkey
    foreign key (team_id)
    references public.teams (id)
    on delete cascade,
  constraint subscriptions_team_id_key unique (team_id),
  constraint subscriptions_plan_check
    check (plan in ('free', 'pro')),
  constraint subscriptions_status_check
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete', 'paused')),
  constraint subscriptions_period_order_check
    check (
      current_period_start is null
      or current_period_end is null
      or current_period_end >= current_period_start
    ),
  constraint subscriptions_provider_subscription_not_blank_check
    check (provider_subscription_id is null or btrim(provider_subscription_id) <> '')
);

create unique index subscriptions_provider_subscription_unique_idx
  on public.subscriptions (provider, provider_subscription_id)
  where provider is not null and provider_subscription_id is not null;

create unique index subscriptions_provider_customer_unique_idx
  on public.subscriptions (provider, provider_customer_id)
  where provider is not null and provider_customer_id is not null;

create index subscriptions_team_status_idx
  on public.subscriptions (team_id, status);

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  team_id uuid,
  subscription_id uuid,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  constraint billing_events_provider_not_blank_check
    check (btrim(provider) <> ''),
  constraint billing_events_provider_event_id_not_blank_check
    check (btrim(provider_event_id) <> ''),
  constraint billing_events_event_type_not_blank_check
    check (btrim(event_type) <> ''),
  constraint billing_events_team_id_fkey
    foreign key (team_id)
    references public.teams (id)
    on delete set null,
  constraint billing_events_subscription_id_fkey
    foreign key (subscription_id)
    references public.subscriptions (id)
    on delete set null,
  constraint billing_events_provider_event_key unique (provider, provider_event_id)
);

create index billing_events_team_received_idx
  on public.billing_events (team_id, received_at desc);

create index billing_events_subscription_received_idx
  on public.billing_events (subscription_id, received_at desc);

alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;

revoke all privileges on table public.subscriptions, public.billing_events
from anon, authenticated;

grant select on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.subscriptions, public.billing_events
to service_role;

create policy subscriptions_select_owned
on public.subscriptions
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.teams
    where teams.id = subscriptions.team_id
      and teams.owner_id = (select auth.uid())
  )
);
