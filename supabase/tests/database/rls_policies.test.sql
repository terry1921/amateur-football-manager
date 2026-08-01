begin;

create extension if not exists pgtap with schema extensions;

select plan(61);

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
  'RLS is enabled on all application tables'
);

select results_eq(
  $$
    select tablename::text collate "C", cmd::text collate "C"
    from pg_policies
    where schemaname = 'public'
      and tablename in ('teams', 'seasons', 'players', 'matches', 'callups', 'match_events')
    order by tablename, cmd
  $$,
  $$
    select table_name::text collate "C", command::text collate "C"
    from (
      values
        ('callups', 'DELETE'), ('callups', 'INSERT'), ('callups', 'SELECT'), ('callups', 'UPDATE'),
        ('match_events', 'DELETE'), ('match_events', 'INSERT'), ('match_events', 'SELECT'), ('match_events', 'UPDATE'),
        ('matches', 'DELETE'), ('matches', 'INSERT'), ('matches', 'SELECT'), ('matches', 'UPDATE'),
        ('players', 'INSERT'), ('players', 'SELECT'), ('players', 'UPDATE'),
        ('seasons', 'INSERT'), ('seasons', 'SELECT'), ('seasons', 'UPDATE'),
        ('teams', 'DELETE'), ('teams', 'INSERT'), ('teams', 'SELECT'), ('teams', 'UPDATE')
    ) as expected(table_name, command)
    order by table_name, command
  $$,
  'every table has its intended lifecycle policies'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('teams', 'seasons', 'players', 'matches', 'callups', 'match_events')
      and cmd = 'UPDATE'
      and qual is not null
      and with_check is not null
  ),
  6::bigint,
  'every UPDATE policy checks both the existing and proposed row'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('teams', 'seasons', 'players', 'matches', 'callups', 'match_events')
      and roles = array['authenticated']::name[]
  ),
  22::bigint,
  'all application policies target only authenticated users'
);

select ok(
  not exists (
    select 1
    from (values
      ('teams'), ('seasons'), ('players'), ('matches'), ('callups'), ('match_events')
    ) as application_tables(table_name)
    where has_table_privilege(
      'anon',
      format('public.%I', table_name),
      'SELECT, INSERT, UPDATE, DELETE'
    )
  ),
  'anonymous users have no application table privileges'
);

select ok(
  not exists (
    select 1
    from (values
      ('teams'), ('seasons'), ('players'), ('matches'), ('callups'), ('match_events')
    ) as application_tables(table_name)
    where not has_table_privilege(
      'authenticated',
      format('public.%I', table_name),
      case
        when table_name in ('seasons', 'players') then 'SELECT, INSERT, UPDATE'
        else 'SELECT, INSERT, UPDATE, DELETE'
      end
    )
  ),
  'authenticated users have the Data API privileges required for CRUD'
);

select ok(
  not exists (
    select 1
    from (values
      ('teams'), ('seasons'), ('players'), ('matches'), ('callups'), ('match_events')
    ) as application_tables(table_name)
    where has_table_privilege(
      'authenticated',
      format('public.%I', table_name),
      'TRUNCATE, TRIGGER, REFERENCES'
    )
  ),
  'authenticated users do not retain non-API table privileges'
);

select ok(
  not exists (
    select 1
    from (values
      ('teams'), ('seasons'), ('players'), ('matches'), ('callups'), ('match_events')
    ) as application_tables(table_name)
    where not has_table_privilege(
      'service_role',
      format('public.%I', table_name),
      'SELECT, INSERT, UPDATE, DELETE'
    )
  ),
  'the service role retains full application table privileges'
);

select has_index(
  'public',
  'teams',
  'teams_owner_id_idx',
  'the direct ownership predicate is indexed'
);

select results_eq(
  $$
    select indexname::text collate "C"
    from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'seasons_team_status_idx',
        'players_team_status_idx',
        'matches_team_kickoff_idx',
        'callups_team_match_idx',
        'match_events_team_match_idx'
      )
    order by indexname
  $$,
  $$
    select name::text collate "C"
    from (values
      ('callups_team_match_idx'),
      ('match_events_team_match_idx'),
      ('matches_team_kickoff_idx'),
      ('players_team_status_idx'),
      ('seasons_team_status_idx')
    ) as expected(name)
  $$,
  'ownership and normal tenant filters have supporting child indexes'
);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000011', 'rls-owner-a@example.test'),
  ('00000000-0000-0000-0000-000000000012', 'rls-owner-b@example.test');

insert into public.teams (id, owner_id, name, slug)
values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'RLS Team A', 'rls-team-a'),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'RLS Team B', 'rls-team-b');

insert into public.seasons (id, team_id, name)
values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'RLS Season A'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'RLS Season B');

insert into public.players (id, team_id, first_name, position)
values
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'RLS Player A', 'MID'),
  ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'RLS Player B', 'FWD');

insert into public.matches (
  id,
  team_id,
  season_id,
  opponent_name,
  kickoff_at,
  home_away
)
values
  (
    '80000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    'RLS Opponent A',
    '2026-08-10 18:00:00+00',
    'home'
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000002',
    'RLS Opponent B',
    '2026-08-11 18:00:00+00',
    'away'
  );

insert into public.callups (id, team_id, match_id, player_id)
values
  (
    '90000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001'
  ),
  (
    '90000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    '80000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000002'
  );

insert into public.match_events (id, team_id, match_id, player_id, type, minute)
values
  (
    'a0000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '80000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    'goal',
    10
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    '80000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000002',
    'yellow_card',
    20
  );

set constraints all immediate;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select id from public.teams order by id$$,
  $$values ('50000000-0000-0000-0000-000000000001'::uuid)$$,
  'an owner sees only their team, even when another team UUID is known'
);

select results_eq(
  $$select id from public.seasons order by id$$,
  $$values ('60000000-0000-0000-0000-000000000001'::uuid)$$,
  'an owner sees only their seasons'
);

select results_eq(
  $$select id from public.players order by id$$,
  $$values ('70000000-0000-0000-0000-000000000001'::uuid)$$,
  'an owner sees only their players'
);

select results_eq(
  $$select id from public.matches order by id$$,
  $$values ('80000000-0000-0000-0000-000000000001'::uuid)$$,
  'an owner sees only their matches'
);

select results_eq(
  $$select id from public.callups order by id$$,
  $$values ('90000000-0000-0000-0000-000000000001'::uuid)$$,
  'an owner sees only call-ups belonging to their matches'
);

select results_eq(
  $$select id from public.match_events order by id$$,
  $$values ('a0000000-0000-0000-0000-000000000001'::uuid)$$,
  'an owner sees only events belonging to their matches'
);

select throws_ok(
  $$insert into public.teams (owner_id, name, slug) values ('00000000-0000-0000-0000-000000000012', 'Spoofed Team', 'spoofed-team')$$,
  '42501',
  null,
  'an authenticated user cannot create a team for another owner'
);

select throws_ok(
  $$insert into public.seasons (team_id, name) values ('50000000-0000-0000-0000-000000000002', 'Cross-tenant Season')$$,
  '42501',
  null,
  'an authenticated user cannot insert a season for another team'
);

select throws_ok(
  $$insert into public.players (team_id, first_name, position) values ('50000000-0000-0000-0000-000000000002', 'Cross-tenant Player', 'GK')$$,
  '42501',
  null,
  'an authenticated user cannot insert a player for another team'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away) values ('50000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'Cross-tenant Match', now(), 'neutral')$$,
  '42501',
  null,
  'an authenticated user cannot insert a match for another team'
);

select throws_ok(
  $$insert into public.callups (team_id, match_id, player_id) values ('50000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001')$$,
  '55000',
  null,
  'a forged own team_id cannot authorize a call-up for another owner''s match'
);

select throws_ok(
  $$insert into public.match_events (team_id, match_id, player_id, type, minute) values ('50000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'goal', 10)$$,
  '42501',
  null,
  'a forged own team_id cannot authorize an event for another owner''s match'
);

select results_eq(
  $$update public.teams set name = 'Attacked' where id = '50000000-0000-0000-0000-000000000002' returning id$$,
  $$select null::uuid where false$$,
  'cross-tenant team updates affect no rows'
);

select results_eq(
  $$update public.seasons set name = 'Attacked' where id = '60000000-0000-0000-0000-000000000002' returning id$$,
  $$select null::uuid where false$$,
  'cross-tenant season updates affect no rows'
);

select results_eq(
  $$update public.players set first_name = 'Attacked' where id = '70000000-0000-0000-0000-000000000002' returning id$$,
  $$select null::uuid where false$$,
  'cross-tenant player updates affect no rows'
);

select results_eq(
  $$update public.matches set notes = 'Attacked' where id = '80000000-0000-0000-0000-000000000002' returning id$$,
  $$select null::uuid where false$$,
  'cross-tenant match updates affect no rows'
);

select results_eq(
  $$update public.callups set status = 'declined' where id = '90000000-0000-0000-0000-000000000002' returning id$$,
  $$select null::uuid where false$$,
  'cross-tenant call-up updates affect no rows'
);

select results_eq(
  $$update public.match_events set minute = 99 where id = 'a0000000-0000-0000-0000-000000000002' returning id$$,
  $$select null::uuid where false$$,
  'cross-tenant event updates affect no rows'
);

select results_eq(
  $$delete from public.teams where id = '50000000-0000-0000-0000-000000000002' returning id$$,
  $$select null::uuid where false$$,
  'cross-tenant team deletes affect no rows'
);

select throws_ok(
  $$delete from public.seasons where id = '60000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'season deletion is unavailable even with a known cross-tenant UUID'
);

select throws_ok(
  $$delete from public.players where id = '70000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'player deletion is unavailable even with a known cross-tenant UUID'
);

select results_eq(
  $$delete from public.matches where id = '80000000-0000-0000-0000-000000000002' returning id$$,
  $$select null::uuid where false$$,
  'cross-tenant match deletes affect no rows'
);

select results_eq(
  $$delete from public.callups where id = '90000000-0000-0000-0000-000000000002' returning id$$,
  $$select null::uuid where false$$,
  'cross-tenant call-up deletes affect no rows'
);

select results_eq(
  $$delete from public.match_events where id = 'a0000000-0000-0000-0000-000000000002' returning id$$,
  $$select null::uuid where false$$,
  'cross-tenant event deletes affect no rows'
);

select throws_ok(
  $$update public.teams set owner_id = '00000000-0000-0000-0000-000000000012' where id = '50000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'an owner cannot transfer a team by changing owner_id'
);

select throws_ok(
  $$update public.seasons set team_id = '50000000-0000-0000-0000-000000000002' where id = '60000000-0000-0000-0000-000000000001'$$,
  '55000',
  null,
  'season ownership is immutable even when another team UUID is known'
);

select throws_ok(
  $$update public.players set team_id = '50000000-0000-0000-0000-000000000002' where id = '70000000-0000-0000-0000-000000000001'$$,
  '55000',
  null,
  'an owner cannot move a player to another owner''s team'
);

select throws_ok(
  $$update public.matches set team_id = '50000000-0000-0000-0000-000000000002', season_id = '60000000-0000-0000-0000-000000000002' where id = '80000000-0000-0000-0000-000000000001'$$,
  '55000',
  null,
  'match team identity is immutable even when another team UUID is known'
);

select throws_ok(
  $$update public.callups set team_id = '50000000-0000-0000-0000-000000000002', match_id = '80000000-0000-0000-0000-000000000002', player_id = '70000000-0000-0000-0000-000000000002' where id = '90000000-0000-0000-0000-000000000001'$$,
  '55000',
  null,
  'an owner cannot move a call-up to another owner''s match'
);

select throws_ok(
  $$update public.match_events set team_id = '50000000-0000-0000-0000-000000000002', match_id = '80000000-0000-0000-0000-000000000002', player_id = '70000000-0000-0000-0000-000000000002' where id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'an owner cannot move an event to another owner''s match'
);

select lives_ok(
  $$insert into public.teams (id, owner_id, name, slug) values ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000011', 'Owned Insert Team', 'owned-insert-team')$$,
  'an owner can insert their own team'
);

select lives_ok(
  $$insert into public.seasons (id, team_id, name) values ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'Owned Insert Season')$$,
  'an owner can insert their own season'
);

select lives_ok(
  $$insert into public.players (id, team_id, first_name, position) values ('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', 'Owned Insert Player', 'DEF')$$,
  'an owner can insert their own player'
);

select lives_ok(
  $$insert into public.matches (id, team_id, season_id, opponent_name, kickoff_at, home_away) values ('80000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Owned Insert Match', '2026-08-12 18:00:00+00', 'neutral')$$,
  'an owner can insert their own match'
);

select lives_ok(
  $$insert into public.callups (id, team_id, match_id, player_id) values ('90000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003')$$,
  'an owner can insert a call-up for their own match'
);

select lives_ok(
  $$insert into public.match_events (id, team_id, match_id, player_id, type, minute) values ('a0000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 'goal', 30)$$,
  'an owner can insert an event for their own match'
);

select results_eq(
  $$update public.teams set name = 'Owned Updated Team' where id = '50000000-0000-0000-0000-000000000003' returning id$$,
  $$values ('50000000-0000-0000-0000-000000000003'::uuid)$$,
  'an owner can update their own team'
);

select results_eq(
  $$update public.seasons set name = 'Owned Updated Season' where id = '60000000-0000-0000-0000-000000000003' returning id$$,
  $$values ('60000000-0000-0000-0000-000000000003'::uuid)$$,
  'an owner can update their own season'
);

select results_eq(
  $$update public.players set first_name = 'Owned Updated Player' where id = '70000000-0000-0000-0000-000000000003' returning id$$,
  $$values ('70000000-0000-0000-0000-000000000003'::uuid)$$,
  'an owner can update their own player'
);

select results_eq(
  $$update public.matches set notes = 'Owned update' where id = '80000000-0000-0000-0000-000000000003' returning id$$,
  $$values ('80000000-0000-0000-0000-000000000003'::uuid)$$,
  'an owner can update their own match'
);

select results_eq(
  $$update public.callups set status = 'confirmed' where id = '90000000-0000-0000-0000-000000000003' returning id$$,
  $$values ('90000000-0000-0000-0000-000000000003'::uuid)$$,
  'an owner can update their own call-up'
);

select results_eq(
  $$update public.match_events set minute = 31 where id = 'a0000000-0000-0000-0000-000000000003' returning id$$,
  $$values ('a0000000-0000-0000-0000-000000000003'::uuid)$$,
  'an owner can update their own event'
);

select results_eq(
  $$delete from public.match_events where id = 'a0000000-0000-0000-0000-000000000003' returning id$$,
  $$values ('a0000000-0000-0000-0000-000000000003'::uuid)$$,
  'an owner can delete their own event'
);

select results_eq(
  $$delete from public.callups where id = '90000000-0000-0000-0000-000000000003' returning id$$,
  $$values ('90000000-0000-0000-0000-000000000003'::uuid)$$,
  'an owner can delete their own call-up'
);

select results_eq(
  $$delete from public.matches where id = '80000000-0000-0000-0000-000000000003' returning id$$,
  $$values ('80000000-0000-0000-0000-000000000003'::uuid)$$,
  'an owner can delete their own match'
);

select throws_ok(
  $$delete from public.players where id = '70000000-0000-0000-0000-000000000003'$$,
  '42501',
  null,
  'an owner must deactivate rather than delete a player'
);

select throws_ok(
  $$delete from public.seasons where id = '60000000-0000-0000-0000-000000000003'$$,
  '42501',
  null,
  'an owner cannot delete season history'
);

select results_eq(
  $$delete from public.teams where id = '50000000-0000-0000-0000-000000000003' returning id$$,
  $$values ('50000000-0000-0000-0000-000000000003'::uuid)$$,
  'an owner can delete their own team'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);
set local role anon;

select throws_ok(
  $$select id from public.teams$$,
  '42501',
  null,
  'anonymous direct SQL and Data API access is denied'
);

reset role;
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;

select is(
  (select count(*) from public.teams),
  2::bigint,
  'the service role bypasses RLS and can read both tenants'
);

select lives_ok(
  $$update public.teams set name = name where id = '50000000-0000-0000-0000-000000000002'$$,
  'the service role retains operational write access without a dedicated policy'
);

reset role;

select * from finish();
rollback;
