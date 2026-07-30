begin;

create extension if not exists pgtap with schema extensions;

select plan(33);

select results_eq(
  $$
    select tablename::text collate "C"
    from pg_tables
    where schemaname = 'public'
      and tablename in ('teams', 'seasons', 'players', 'matches', 'callups', 'match_events')
    order by tablename
  $$,
  $$
    select name::text collate "C"
    from (values
      ('callups'),
      ('match_events'),
      ('matches'),
      ('players'),
      ('seasons'),
      ('teams')
    ) as expected(name)
  $$,
  'all MVP tables exist'
);

select col_is_pk('public', 'teams', 'id', 'teams uses a UUID primary key');
select col_is_pk('public', 'seasons', 'id', 'seasons uses a UUID primary key');
select col_is_pk('public', 'players', 'id', 'players uses a UUID primary key');
select col_is_pk('public', 'matches', 'id', 'matches uses a UUID primary key');
select col_is_pk('public', 'callups', 'id', 'callups uses a UUID primary key');
select col_is_pk('public', 'match_events', 'id', 'match events use a UUID primary key');

select results_eq(
  $$
    select conname::text collate "C"
    from pg_constraint
    where contype = 'f'
      and conrelid in (
        'public.teams'::regclass,
        'public.seasons'::regclass,
        'public.players'::regclass,
        'public.matches'::regclass,
        'public.callups'::regclass,
        'public.match_events'::regclass
      )
    order by conname
  $$,
  $$
    select name::text collate "C"
    from (values
      ('callups_team_match_fkey'),
      ('callups_team_player_fkey'),
      ('match_events_team_match_fkey'),
      ('match_events_team_player_fkey'),
      ('match_events_team_related_player_fkey'),
      ('matches_team_id_fkey'),
      ('matches_team_season_fkey'),
      ('players_team_id_fkey'),
      ('seasons_team_id_fkey'),
      ('teams_owner_id_fkey')
    ) as expected(name)
  $$,
  'all expected foreign keys exist'
);

select results_eq(
  $$
    select indexname::text collate "C"
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'teams_slug_unique_idx',
        'teams_owner_id_idx',
        'seasons_team_status_idx',
        'seasons_one_active_per_team_idx',
        'players_team_status_idx',
        'matches_team_kickoff_idx',
        'matches_team_season_idx',
        'matches_season_kickoff_idx',
        'matches_team_status_kickoff_idx',
        'callups_player_id_idx',
        'callups_team_match_idx',
        'callups_team_player_idx',
        'match_events_match_type_idx',
        'match_events_player_type_idx',
        'match_events_team_match_idx',
        'match_events_team_player_idx',
        'match_events_team_related_player_idx'
      )
    order by indexname
  $$,
  $$
    select name::text collate "C"
    from (values
      ('callups_player_id_idx'),
      ('callups_team_match_idx'),
      ('callups_team_player_idx'),
      ('match_events_match_type_idx'),
      ('match_events_player_type_idx'),
      ('match_events_team_match_idx'),
      ('match_events_team_player_idx'),
      ('match_events_team_related_player_idx'),
      ('matches_season_kickoff_idx'),
      ('matches_team_kickoff_idx'),
      ('matches_team_season_idx'),
      ('matches_team_status_kickoff_idx'),
      ('players_team_status_idx'),
      ('seasons_one_active_per_team_idx'),
      ('seasons_team_status_idx'),
      ('teams_owner_id_idx'),
      ('teams_slug_unique_idx')
    ) as expected(name)
  $$,
  'all purpose-built indexes exist'
);

select results_eq(
  $$
    select relname::text collate "C"
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in ('teams', 'seasons', 'players', 'matches', 'callups', 'match_events')
      and relrowsecurity
    order by relname
  $$,
  $$
    select name::text collate "C"
    from (values
      ('callups'),
      ('match_events'),
      ('matches'),
      ('players'),
      ('seasons'),
      ('teams')
    ) as expected(name)
  $$,
  'RLS is enabled on every application table'
);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000001', 'owner-a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'owner-b@example.test');

insert into public.teams (id, owner_id, name, slug)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Team A', 'team-a'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Team B', 'team-b');

select throws_ok(
  $$insert into public.teams (owner_id, name, slug) values ('00000000-0000-0000-0000-000000000002', 'Duplicate Slug', 'TEAM-A')$$,
  '23505',
  null,
  'team slugs are unique case-insensitively'
);

insert into public.seasons (id, team_id, name, status)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Season A', 'draft'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Season B', 'draft');

insert into public.players (id, team_id, first_name, position)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Player A', 'GK'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Player A2', 'MID'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Player B', 'FWD');

insert into public.matches (
  id,
  team_id,
  season_id,
  opponent_name,
  kickoff_at,
  home_away
)
values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Opponent',
  '2026-08-01 18:00:00+00',
  'home'
);

insert into public.callups (team_id, match_id, player_id)
values (
  '10000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001'
);

set constraints all immediate;

select throws_ok(
  $$insert into public.players (team_id, first_name, position) values ('10000000-0000-0000-0000-000000000001', 'Invalid Position', 'STRIKER')$$,
  '23514',
  null,
  'invalid player positions are rejected'
);

select throws_ok(
  $$insert into public.players (team_id, first_name, position, status) values ('10000000-0000-0000-0000-000000000001', 'Invalid Status', 'DEF', 'retired')$$,
  '23514',
  null,
  'invalid player statuses are rejected'
);

select throws_ok(
  $$insert into public.players (team_id, first_name, position, shirt_number) values ('10000000-0000-0000-0000-000000000001', 'Invalid Shirt', 'DEF', 1000)$$,
  '23514',
  null,
  'shirt numbers outside 0 through 999 are rejected'
);

select lives_ok(
  $$insert into public.players (team_id, first_name, position, shirt_number) values ('10000000-0000-0000-0000-000000000001', 'Three Digit Shirt', 'DEF', 999)$$,
  'three-digit shirt numbers through 999 are accepted'
);

select throws_ok(
  $$insert into public.seasons (team_id, name, start_date, end_date) values ('10000000-0000-0000-0000-000000000001', 'Bad Dates', '2026-08-02', '2026-08-01')$$,
  '23514',
  null,
  'season end dates cannot precede start dates'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away, team_score, opponent_score) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Opponent', now(), 'away', -1, 0)$$,
  '23514',
  null,
  'negative scores are rejected'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away, team_score) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Opponent', now(), 'away', 1)$$,
  '23514',
  null,
  'scores must be supplied as a pair'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away, status) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Opponent', now(), 'away', 'postponed')$$,
  '23514',
  null,
  'invalid match statuses are rejected'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away, status) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Opponent', now(), 'away', 'completed')$$,
  '23514',
  null,
  'completed matches require both scores'
);

select throws_ok(
  $$insert into public.callups (team_id, match_id, player_id) values ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001')$$,
  '23505',
  null,
  'a player can appear only once in a match call-up'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Opponent', now(), 'neutral')$$,
  '23503',
  null,
  'matches cannot use another team''s season'
);

select throws_ok(
  $$insert into public.callups (team_id, match_id, player_id) values ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003')$$,
  '23503',
  null,
  'call-ups cannot use another team''s player'
);

select throws_ok(
  $$insert into public.match_events (team_id, match_id, player_id, type) values ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'goal')$$,
  '23503',
  null,
  'events cannot use another team''s player'
);

select throws_ok(
  $$insert into public.match_events (team_id, match_id, player_id, related_player_id, type) values ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 'goal')$$,
  '23503',
  null,
  'assists cannot use another team''s player'
);

select throws_ok(
  $$insert into public.match_events (team_id, match_id, player_id, type) values ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'assist')$$,
  '23514',
  null,
  'assists cannot be stored as separate events'
);

select throws_ok(
  $$insert into public.match_events (team_id, match_id, player_id, related_player_id, type) values ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'yellow_card')$$,
  '23514',
  null,
  'related players are allowed only on goals'
);

select throws_ok(
  $$insert into public.match_events (team_id, match_id, player_id, type, minute) values ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'goal', -1)$$,
  '23514',
  null,
  'negative event minutes are rejected'
);

insert into public.seasons (team_id, name, status)
values ('10000000-0000-0000-0000-000000000001', 'Active A', 'active');

select throws_ok(
  $$insert into public.seasons (team_id, name, status) values ('10000000-0000-0000-0000-000000000001', 'Another Active A', 'active')$$,
  '23505',
  null,
  'a team can have only one active season'
);

update public.teams
set updated_at = '2000-01-01 00:00:00+00'
where id = '10000000-0000-0000-0000-000000000001';

select ok(
  (select updated_at > '2000-01-01 00:00:00+00' from public.teams where id = '10000000-0000-0000-0000-000000000001'),
  'the shared trigger maintains updated_at'
);

select throws_ok(
  $$delete from public.players where id = '30000000-0000-0000-0000-000000000001'$$,
  '23503',
  null,
  'players with historical call-ups cannot be deleted directly'
);

insert into public.matches (
  id,
  team_id,
  season_id,
  opponent_name,
  kickoff_at,
  home_away
)
values (
  '40000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  'Opponent B',
  '2026-08-02 18:00:00+00',
  'away'
);

insert into public.callups (team_id, match_id, player_id)
values (
  '10000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003'
);

insert into public.match_events (team_id, match_id, player_id, type)
values (
  '10000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003',
  'goal'
);

select throws_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-000000000002'$$,
  '23503',
  null,
  'owners cannot be deleted while they still own a team'
);

set constraints all deferred;

delete from public.teams
where id = '10000000-0000-0000-0000-000000000002';

set constraints all immediate;

select is(
  (
    select count(*)
    from (
      select id from public.teams where id = '10000000-0000-0000-0000-000000000002'
      union all
      select id from public.seasons where team_id = '10000000-0000-0000-0000-000000000002'
      union all
      select id from public.players where team_id = '10000000-0000-0000-0000-000000000002'
      union all
      select id from public.matches where team_id = '10000000-0000-0000-0000-000000000002'
      union all
      select id from public.callups where team_id = '10000000-0000-0000-0000-000000000002'
      union all
      select id from public.match_events where team_id = '10000000-0000-0000-0000-000000000002'
    ) as team_records
  ),
  0::bigint,
  'deleting a team removes its complete tenant data graph'
);

select * from finish();
rollback;
