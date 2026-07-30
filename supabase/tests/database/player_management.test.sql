begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select has_trigger(
  'public',
  'players',
  'guard_player_team_identity',
  'player team identity is guarded by a trigger'
);

select ok(
  not has_table_privilege('authenticated', 'public.players', 'DELETE'),
  'authenticated users cannot hard-delete players'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'players'
      and cmd = 'DELETE'
  ),
  0::bigint,
  'players expose no authenticated delete policy'
);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000081', 'players-owner@example.test');

insert into public.teams (id, owner_id, name, slug)
values ('10000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000081', 'Player History FC', 'player-history-fc');

select lives_ok(
  $$insert into public.players (id, team_id, first_name, shirt_number, position) values
    ('20000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', 'First', 10, 'MID'),
    ('20000000-0000-0000-0000-000000000082', '10000000-0000-0000-0000-000000000081', 'Second', 10, 'FWD'),
    ('20000000-0000-0000-0000-000000000083', '10000000-0000-0000-0000-000000000081', 'Third', null, 'DEF')$$,
  'shirt numbers may be duplicated or omitted under the existing schema rule'
);

select throws_ok(
  $$update public.players set team_id = gen_random_uuid() where id = '20000000-0000-0000-0000-000000000081'$$,
  '55000',
  null,
  'a player cannot be moved to another team'
);

insert into public.seasons (id, team_id, name)
values ('30000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', 'History Season');

insert into public.matches (id, team_id, season_id, opponent_name, kickoff_at, home_away)
values ('40000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', '30000000-0000-0000-0000-000000000081', 'History Rival', now(), 'home');

insert into public.callups (id, team_id, match_id, player_id)
values ('50000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', '40000000-0000-0000-0000-000000000081', '20000000-0000-0000-0000-000000000081');

insert into public.match_events (id, team_id, match_id, player_id, type, minute)
values ('60000000-0000-0000-0000-000000000081', '10000000-0000-0000-0000-000000000081', '40000000-0000-0000-0000-000000000081', '20000000-0000-0000-0000-000000000081', 'goal', 21);

select lives_ok(
  $$update public.players set status = 'inactive' where id = '20000000-0000-0000-0000-000000000081'$$,
  'a player may leave the team through status change'
);

select results_eq(
  $$select status from public.players where id = '20000000-0000-0000-0000-000000000081'$$,
  $$values ('inactive'::text)$$,
  'the inactive player record remains available'
);

select results_eq(
  $$select c.player_id, e.player_id from public.callups c join public.match_events e using (team_id, match_id) where c.player_id = '20000000-0000-0000-0000-000000000081'$$,
  $$values ('20000000-0000-0000-0000-000000000081'::uuid, '20000000-0000-0000-0000-000000000081'::uuid)$$,
  'call-ups and match events remain attributable after deactivation'
);

set constraints all immediate;

select throws_ok(
  $$delete from public.players where id = '20000000-0000-0000-0000-000000000081'$$,
  '23503',
  null,
  'historical foreign keys independently prevent deletion by privileged roles'
);

select * from finish();
rollback;
