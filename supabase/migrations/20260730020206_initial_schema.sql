create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  short_name text,
  slug text not null,
  logo_url text,
  primary_color text,
  secondary_color text,
  city text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_owner_id_fkey
    foreign key (owner_id)
    references auth.users (id)
    on delete restrict,
  constraint teams_name_not_blank_check
    check (btrim(name) <> ''),
  constraint teams_slug_not_blank_check
    check (btrim(slug) <> '')
);

create unique index teams_slug_unique_idx on public.teams (lower(slug));
create index teams_owner_id_idx on public.teams (owner_id);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  name text not null,
  start_date date,
  end_date date,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_team_id_fkey
    foreign key (team_id)
    references public.teams (id)
    on delete cascade,
  constraint seasons_team_id_id_key unique (team_id, id),
  constraint seasons_name_not_blank_check
    check (btrim(name) <> ''),
  constraint seasons_status_check
    check (status in ('draft', 'active', 'completed')),
  constraint seasons_date_order_check
    check (start_date is null or end_date is null or end_date >= start_date)
);

create index seasons_team_status_idx on public.seasons (team_id, status);
create unique index seasons_one_active_per_team_idx
  on public.seasons (team_id)
  where status = 'active';

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  first_name text not null,
  last_name text,
  nickname text,
  shirt_number integer,
  position text not null,
  photo_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_team_id_fkey
    foreign key (team_id)
    references public.teams (id)
    on delete cascade,
  constraint players_team_id_id_key unique (team_id, id),
  constraint players_first_name_not_blank_check
    check (btrim(first_name) <> ''),
  constraint players_position_check
    check (position in ('GK', 'DEF', 'MID', 'FWD')),
  constraint players_status_check
    check (status in ('active', 'injured', 'suspended', 'inactive')),
  constraint players_shirt_number_check
    check (shirt_number is null or shirt_number between 0 and 99)
);

create index players_team_status_idx on public.players (team_id, status);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  season_id uuid not null,
  opponent_name text not null,
  opponent_logo_url text,
  competition text,
  round text,
  venue text,
  kickoff_at timestamptz not null,
  home_away text not null,
  status text not null default 'scheduled',
  team_score integer,
  opponent_score integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_team_id_fkey
    foreign key (team_id)
    references public.teams (id)
    on delete cascade,
  constraint matches_team_season_fkey
    foreign key (team_id, season_id)
    references public.seasons (team_id, id)
    on delete no action
    deferrable initially deferred,
  constraint matches_team_id_id_key unique (team_id, id),
  constraint matches_opponent_name_not_blank_check
    check (btrim(opponent_name) <> ''),
  constraint matches_home_away_check
    check (home_away in ('home', 'away', 'neutral')),
  constraint matches_status_check
    check (status in ('scheduled', 'completed', 'cancelled')),
  constraint matches_scores_nonnegative_check
    check (
      (team_score is null or team_score >= 0)
      and (opponent_score is null or opponent_score >= 0)
    ),
  constraint matches_scores_paired_check
    check ((team_score is null) = (opponent_score is null)),
  constraint matches_completed_scores_check
    check (status <> 'completed' or team_score is not null)
);

create index matches_team_kickoff_idx
  on public.matches (team_id, kickoff_at);
create index matches_season_kickoff_idx
  on public.matches (season_id, kickoff_at);
create index matches_team_season_idx
  on public.matches (team_id, season_id);
create index matches_team_status_kickoff_idx
  on public.matches (team_id, status, kickoff_at);

create table public.callups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  match_id uuid not null,
  player_id uuid not null,
  status text not null default 'called_up',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint callups_team_match_fkey
    foreign key (team_id, match_id)
    references public.matches (team_id, id)
    on delete cascade,
  constraint callups_team_player_fkey
    foreign key (team_id, player_id)
    references public.players (team_id, id)
    on delete no action
    deferrable initially deferred,
  constraint callups_match_player_key unique (match_id, player_id),
  constraint callups_status_check
    check (status in ('called_up', 'confirmed', 'declined'))
);

create index callups_player_id_idx on public.callups (player_id);
create index callups_team_match_idx on public.callups (team_id, match_id);
create index callups_team_player_idx on public.callups (team_id, player_id);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null,
  match_id uuid not null,
  player_id uuid not null,
  related_player_id uuid,
  type text not null,
  minute integer,
  created_at timestamptz not null default now(),
  constraint match_events_team_match_fkey
    foreign key (team_id, match_id)
    references public.matches (team_id, id)
    on delete cascade,
  constraint match_events_team_player_fkey
    foreign key (team_id, player_id)
    references public.players (team_id, id)
    on delete no action
    deferrable initially deferred,
  constraint match_events_team_related_player_fkey
    foreign key (team_id, related_player_id)
    references public.players (team_id, id)
    on delete no action
    deferrable initially deferred,
  constraint match_events_type_check
    check (type in ('goal', 'yellow_card', 'red_card')),
  constraint match_events_minute_check
    check (minute is null or minute >= 0),
  constraint match_events_assist_check
    check (
      related_player_id is null
      or (type = 'goal' and related_player_id <> player_id)
    )
);

create index match_events_match_type_idx
  on public.match_events (match_id, type);
create index match_events_player_type_idx
  on public.match_events (player_id, type);
create index match_events_team_match_idx
  on public.match_events (team_id, match_id);
create index match_events_team_player_idx
  on public.match_events (team_id, player_id);
create index match_events_team_related_player_idx
  on public.match_events (team_id, related_player_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger seasons_set_updated_at
before update on public.seasons
for each row execute function public.set_updated_at();

create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger callups_set_updated_at
before update on public.callups
for each row execute function public.set_updated_at();

alter table public.teams enable row level security;
alter table public.seasons enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.callups enable row level security;
alter table public.match_events enable row level security;
