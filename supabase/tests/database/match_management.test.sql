begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select function_privs_are(
  'public',
  'can_delete_owned_match',
  array['uuid', 'uuid'],
  'anon',
  array[]::text[],
  'anonymous users cannot call the match deletion predicate'
);

insert into auth.users (id, email)
values
  ('02000000-0000-0000-0000-000000000001', 'match-owner@example.test'),
  ('02000000-0000-0000-0000-000000000002', 'foreign-match-owner@example.test');

insert into public.teams (id, owner_id, name, slug)
values
  ('12000000-0000-0000-0000-000000000001', '02000000-0000-0000-0000-000000000001', 'Match Team A', 'match-team-a'),
  ('12000000-0000-0000-0000-000000000002', '02000000-0000-0000-0000-000000000001', 'Match Team B', 'match-team-b'),
  ('12000000-0000-0000-0000-000000000003', '02000000-0000-0000-0000-000000000002', 'Foreign Match Team', 'foreign-match-team');

insert into public.seasons (id, team_id, name, status)
values
  ('22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Active Match Season', 'active'),
  ('22000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000002', 'Other Match Season', 'draft'),
  ('22000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', 'Foreign Match Season', 'draft');

insert into public.players (id, team_id, first_name, position)
values ('32000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Match Player', 'MID');

insert into public.matches (
  id,
  team_id,
  season_id,
  opponent_name,
  kickoff_at,
  home_away,
  status,
  team_score,
  opponent_score
)
values
  (
    '42000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000001',
    'Editable Opponent',
    '2026-09-01 18:00:00+00',
    'home',
    'scheduled',
    null,
    null
  ),
  (
    '42000000-0000-0000-0000-000000000002',
    '12000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000001',
    'Dependent Opponent',
    '2026-09-02 18:00:00+00',
    'away',
    'scheduled',
    null,
    null
  ),
  (
    '42000000-0000-0000-0000-000000000003',
    '12000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000001',
    'Completed Opponent',
    '2026-08-20 18:00:00+00',
    'neutral',
    'completed',
    2,
    1
  ),
  (
    '42000000-0000-0000-0000-000000000004',
    '12000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000001',
    'Delete Me',
    '2026-09-03 18:00:00+00',
    'home',
    'scheduled',
    null,
    null
  ),
  (
    '42000000-0000-0000-0000-000000000005',
    '12000000-0000-0000-0000-000000000003',
    '22000000-0000-0000-0000-000000000003',
    'Foreign Empty Opponent',
    '2026-09-04 18:00:00+00',
    'home',
    'scheduled',
    null,
    null
  ),
  (
    '42000000-0000-0000-0000-000000000006',
    '12000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000001',
    'Result Opponent',
    '2026-09-05 18:00:00+00',
    'away',
    'scheduled',
    null,
    null
  );

insert into public.callups (team_id, match_id, player_id)
values (
  '12000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000002',
  '32000000-0000-0000-0000-000000000001'
);

insert into public.match_events (team_id, match_id, player_id, type, minute)
values (
  '12000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000002',
  '32000000-0000-0000-0000-000000000001',
  'goal',
  10
);

set constraints all immediate;

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away, team_score, opponent_score) values ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Scored schedule', now(), 'home', 0, 0)$$,
  '23514',
  null,
  'scheduled matches cannot carry scores'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away, status, team_score, opponent_score) values ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Scored cancellation', now(), 'home', 'cancelled', 1, 1)$$,
  '23514',
  null,
  'cancelled matches cannot carry scores'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away, status) values ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Missing result', now(), 'away', 'completed')$$,
  '23514',
  null,
  'completed matches require scores'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away, status, team_score, opponent_score) values ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Negative result', now(), 'away', 'completed', -1, 0)$$,
  '23514',
  null,
  'completed scores cannot be negative'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away) values ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Invalid location', now(), 'somewhere')$$,
  '23514',
  null,
  'unsupported match locations are rejected'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away, status) values ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Invalid status', now(), 'home', 'postponed')$$,
  '23514',
  null,
  'unsupported match statuses are rejected'
);

select throws_ok(
  $$insert into public.matches (team_id, season_id, opponent_name, kickoff_at, home_away) values ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', 'Foreign season', now(), 'neutral')$$,
  '23503',
  null,
  'a match cannot reference another team season'
);

select lives_ok(
  $$update public.matches set opponent_name = 'Updated Opponent' where id = '42000000-0000-0000-0000-000000000001'$$,
  'scheduled fixture details remain editable'
);

select lives_ok(
  $$update public.matches set status = 'cancelled', team_score = null, opponent_score = null where id = '42000000-0000-0000-0000-000000000001'$$,
  'scheduled fixtures can transition to cancelled'
);

select lives_ok(
  $$update public.matches set status = 'completed', team_score = 3, opponent_score = 2 where id = '42000000-0000-0000-0000-000000000006'$$,
  'scheduled fixtures can transition to completed with both scores'
);

select results_eq(
  $$select status, team_score, opponent_score from public.matches where id = '42000000-0000-0000-0000-000000000006'$$,
  $$values ('completed', 3, 2)$$,
  'completed result stores the lifecycle state and scores together'
);

select throws_ok(
  $$update public.matches set opponent_name = 'Rewritten cancellation' where id = '42000000-0000-0000-0000-000000000001'$$,
  '55000',
  null,
  'cancelled fixture history is immutable'
);

select throws_ok(
  $$update public.matches set opponent_name = 'Rewritten result' where id = '42000000-0000-0000-0000-000000000003'$$,
  '55000',
  null,
  'completed fixture history is immutable'
);

select throws_ok(
  $$update public.matches set team_id = '12000000-0000-0000-0000-000000000002', season_id = '22000000-0000-0000-0000-000000000002' where id = '42000000-0000-0000-0000-000000000002'$$,
  '55000',
  null,
  'match team identity is immutable'
);

select set_config('request.jwt.claim.sub', '02000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select is(
  public.can_delete_owned_match(
    '42000000-0000-0000-0000-000000000005',
    '12000000-0000-0000-0000-000000000003'
  ),
  false,
  'the deletion predicate reveals no eligibility for a foreign match UUID'
);

select results_eq(
  $$delete from public.matches where id = '42000000-0000-0000-0000-000000000004' returning id$$,
  $$values ('42000000-0000-0000-0000-000000000004'::uuid)$$,
  'an owner can delete an empty scheduled fixture'
);

select results_eq(
  $$delete from public.matches where id in ('42000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000003') returning id$$,
  $$select null::uuid where false$$,
  'dependent and completed fixtures cannot be deleted'
);

reset role;

select * from finish();
rollback;
