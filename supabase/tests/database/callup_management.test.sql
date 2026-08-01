begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select function_privs_are(
  'public',
  'replace_match_callup',
  array['uuid', 'uuid[]'],
  'anon',
  array[]::text[],
  'anonymous users cannot replace a call-up'
);

select function_privs_are(
  'public',
  'replace_match_callup',
  array['uuid', 'uuid[]'],
  'authenticated',
  array['EXECUTE'],
  'authenticated users may invoke the transactional call-up replacement'
);

insert into auth.users (id, email)
values
  ('03000000-0000-0000-0000-000000000001', 'callup-owner@example.test'),
  ('03000000-0000-0000-0000-000000000002', 'foreign-callup-owner@example.test');

insert into public.teams (id, owner_id, name, slug)
values
  ('13000000-0000-0000-0000-000000000001', '03000000-0000-0000-0000-000000000001', 'Callup Team', 'callup-team'),
  ('13000000-0000-0000-0000-000000000002', '03000000-0000-0000-0000-000000000002', 'Foreign Callup Team', 'foreign-callup-team');

insert into public.seasons (id, team_id, name, status)
values
  ('23000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'Callup Season', 'active'),
  ('23000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', 'Foreign Callup Season', 'active');

insert into public.players (id, team_id, first_name, position, status)
values
  ('33000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', 'Selected', 'GK', 'active'),
  ('33000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000001', 'Available', 'DEF', 'active'),
  ('33000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000001', 'Unavailable', 'MID', 'injured'),
  ('33000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000002', 'Foreign', 'FWD', 'active');

insert into public.matches (id, team_id, season_id, opponent_name, kickoff_at, home_away)
values
  ('43000000-0000-0000-0000-000000000001', '13000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'Scheduled Opponent', '2026-09-01 18:00:00+00', 'home'),
  ('43000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'Completed Opponent', '2026-08-01 18:00:00+00', 'away'),
  ('43000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-000000000001', 'Cancelled Opponent', '2026-08-02 18:00:00+00', 'neutral'),
  ('43000000-0000-0000-0000-000000000004', '13000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-000000000002', 'Foreign Opponent', '2026-09-02 18:00:00+00', 'home');

insert into public.callups (team_id, match_id, player_id)
values
  ('13000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001'),
  ('13000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000001'),
  ('13000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000003', '33000000-0000-0000-0000-000000000002');

set local role service_role;

update public.matches
set status = 'completed', team_score = 2, opponent_score = 1
where id = '43000000-0000-0000-0000-000000000002';

update public.matches
set status = 'cancelled'
where id = '43000000-0000-0000-0000-000000000003';

update public.players
set status = 'injured'
where id = '33000000-0000-0000-0000-000000000001';

reset role;
set constraints all immediate;
select set_config('request.jwt.claim.sub', '03000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select results_eq(
  $$select player_id from public.replace_match_callup('43000000-0000-0000-0000-000000000001', array['33000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000002']::uuid[]) order by player_id$$,
  $$values ('33000000-0000-0000-0000-000000000001'::uuid), ('33000000-0000-0000-0000-000000000002'::uuid)$$,
  'replacement retains a now-unavailable historical selection and adds an active player'
);

select throws_ok(
  $$select public.replace_match_callup('43000000-0000-0000-0000-000000000001', array['33000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000002']::uuid[])$$,
  '22023',
  null,
  'duplicate player IDs are rejected'
);

select is(
  (select count(*) from public.callups where match_id = '43000000-0000-0000-0000-000000000001'),
  2::bigint,
  'a rejected duplicate replacement leaves the existing squad untouched'
);

select throws_ok(
  $$select public.replace_match_callup('43000000-0000-0000-0000-000000000001', array['33000000-0000-0000-0000-000000000003']::uuid[])$$,
  '22023',
  null,
  'a newly selected unavailable player is rejected'
);

select throws_ok(
  $$select public.replace_match_callup('43000000-0000-0000-0000-000000000001', array['33000000-0000-0000-0000-000000000004']::uuid[])$$,
  '22023',
  null,
  'a foreign player is rejected without revealing ownership'
);

select is(
  (select count(*) from public.callups where match_id = '43000000-0000-0000-0000-000000000001'),
  2::bigint,
  'failed validation is atomic and preserves the full previous squad'
);

select throws_ok(
  $$select public.replace_match_callup('43000000-0000-0000-0000-000000000002', array[]::uuid[])$$,
  '55000',
  null,
  'completed call-ups are read-only through the RPC'
);

select results_eq(
  $$delete from public.callups where match_id = '43000000-0000-0000-0000-000000000002' returning id$$,
  $$select null::uuid where false$$,
  'completed call-ups cannot be deleted directly'
);

select results_eq(
  $$update public.callups set status = 'confirmed' where match_id = '43000000-0000-0000-0000-000000000003' returning id$$,
  $$select null::uuid where false$$,
  'cancelled call-ups cannot be updated directly'
);

select throws_ok(
  $$update public.callups set player_id = '33000000-0000-0000-0000-000000000002' where match_id = '43000000-0000-0000-0000-000000000001' and player_id = '33000000-0000-0000-0000-000000000001'$$,
  '55000',
  null,
  'call-up match, player, and team identity are immutable'
);

select lives_ok(
  $$select public.replace_match_callup('43000000-0000-0000-0000-000000000001', array[]::uuid[])$$,
  'an empty replacement clears an editable scheduled call-up'
);

select is(
  (select count(*) from public.callups where match_id = '43000000-0000-0000-0000-000000000001'),
  0::bigint,
  'the scheduled call-up is empty after clearing'
);

reset role;

select * from finish();
rollback;
