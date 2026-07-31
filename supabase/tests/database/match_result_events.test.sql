begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email)
values ('04000000-0000-0000-0000-000000000001', 'result-events@example.test');

insert into public.teams (id, owner_id, name, slug)
values ('14000000-0000-0000-0000-000000000001', '04000000-0000-0000-0000-000000000001', 'Result Events Team', 'result-events-team');

insert into public.seasons (id, team_id, name, status)
values ('24000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'Result Events Season', 'active');

insert into public.players (id, team_id, first_name, position)
values
  ('34000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'Goal Player', 'FWD'),
  ('34000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000001', 'Card Player', 'DEF');

insert into public.matches (id, team_id, season_id, opponent_name, kickoff_at, home_away)
values
  ('44000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'Result Opponent', '2026-09-10 18:00:00+00', 'home'),
  ('44000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'Rollback Opponent', '2026-09-11 18:00:00+00', 'away');

insert into public.callups (team_id, match_id, player_id)
values
  ('14000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001', '34000000-0000-0000-0000-000000000001'),
  ('14000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001', '34000000-0000-0000-0000-000000000002');

select set_config('request.jwt.claim.sub', '04000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select throws_ok(
  $$select public.complete_match_with_events(
    '44000000-0000-0000-0000-000000000001',
    2,
    1,
    '[{"type":"goal","player_id":"34000000-0000-0000-0000-000000000001","minute":12}]'::jsonb
  )$$,
  '22023',
  null,
  'goal count mismatch prevents completion'
);

select results_eq(
  $$select status, team_score, opponent_score from public.matches where id = '44000000-0000-0000-0000-000000000001'$$,
  $$values ('scheduled', null::integer, null::integer)$$,
  'goal mismatch rolls back all match changes'
);

select is(
  (select count(*)::integer from public.match_events where match_id = '44000000-0000-0000-0000-000000000001'),
  0,
  'goal mismatch inserts no events'
);

select lives_ok(
  $$select public.complete_match_with_events(
    '44000000-0000-0000-0000-000000000001',
    2,
    1,
    '[
      {"type":"goal","player_id":"34000000-0000-0000-0000-000000000001","minute":12},
      {"type":"goal","player_id":"34000000-0000-0000-0000-000000000001","minute":78,"stoppage_time":2,"notes":"Header"},
      {"type":"yellow_card","player_id":"34000000-0000-0000-0000-000000000002","minute":80},
      {"type":"red_card","player_id":"34000000-0000-0000-0000-000000000002","minute":90}
    ]'::jsonb
  )$$,
  'valid score and events complete together'
);

select results_eq(
  $$select status, team_score, opponent_score from public.matches where id = '44000000-0000-0000-0000-000000000001'$$,
  $$values ('completed', 2, 1)$$,
  'completed match stores the final score'
);

select results_eq(
  $$select type, minute, stoppage_time, notes from public.match_events where match_id = '44000000-0000-0000-0000-000000000001' order by minute$$,
  $$values ('goal', 12, 0, null::text), ('goal', 78, 2, 'Header'), ('yellow_card', 80, 0, null::text), ('red_card', 90, 0, null::text)$$,
  'normalized event rows preserve timeline metadata'
);

select is(
  (select count(*)::integer from public.match_events where match_id = '44000000-0000-0000-0000-000000000001' and type = 'goal'),
  2,
  'managed-team goal events reconcile with the final score'
);

select throws_ok(
  $$select public.complete_match_with_events(
    '44000000-0000-0000-0000-000000000001',
    2,
    1,
    '[]'::jsonb
  )$$,
  '55000',
  null,
  'completed matches reject duplicate completion'
);

select throws_ok(
  $$select public.complete_match_with_events(
    '44000000-0000-0000-0000-000000000002',
    1,
    0,
    '[{"type":"goal","player_id":"34000000-0000-0000-0000-000000000001","minute":30}]'::jsonb
  )$$,
  '23503',
  null,
  'events require membership in the target match call-up'
);

select results_eq(
  $$select status, team_score, opponent_score from public.matches where id = '44000000-0000-0000-0000-000000000002'$$,
  $$values ('scheduled', null::integer, null::integer)$$,
  'call-up failure rolls back the target match'
);

select is(
  (select count(*)::integer from public.match_events where match_id = '44000000-0000-0000-0000-000000000002'),
  0,
  'call-up failure inserts no events'
);

select results_eq(
  $$update public.match_events set minute = 91 where match_id = '44000000-0000-0000-0000-000000000001' returning id$$,
  $$select null::uuid where false$$,
  'completed match events are immutable'
);

select * from finish();
rollback;
