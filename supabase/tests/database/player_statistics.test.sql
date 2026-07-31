begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

insert into auth.users (id, email)
values ('06000000-0000-0000-0000-000000000001', 'player-statistics@example.test');

insert into public.teams (id, owner_id, name, slug)
values ('16000000-0000-0000-0000-000000000001', '06000000-0000-0000-0000-000000000001', 'Player Statistics Team', 'player-statistics-team');

insert into public.seasons (id, team_id, name, status)
values
  ('26000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'Current Season', 'active'),
  ('26000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000001', 'Previous Season', 'completed');

insert into public.players (id, team_id, first_name, last_name, position, status)
values
  ('36000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', 'Two', 'Goals', 'FWD', 'active'),
  ('36000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000001', 'Card', 'History', 'DEF', 'active'),
  ('36000000-0000-0000-0000-000000000003', '16000000-0000-0000-0000-000000000001', 'Former', 'Player', 'MID', 'inactive');

insert into public.matches (id, team_id, season_id, opponent_name, kickoff_at, home_away)
values
  ('46000000-0000-0000-0000-000000000001', '16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', 'Current Opponent', '2026-09-10 18:00:00+00', 'home'),
  ('46000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000002', 'Previous Opponent', '2026-06-10 18:00:00+00', 'away'),
  ('46000000-0000-0000-0000-000000000003', '16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001', 'Scheduled Opponent', '2026-10-10 18:00:00+00', 'home');

insert into public.callups (team_id, match_id, player_id)
values
  ('16000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', '36000000-0000-0000-0000-000000000001'),
  ('16000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', '36000000-0000-0000-0000-000000000002'),
  ('16000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000002', '36000000-0000-0000-0000-000000000001'),
  ('16000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000003', '36000000-0000-0000-0000-000000000002');

select set_config('request.jwt.claim.sub', '06000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select public.complete_match_with_events(
    '46000000-0000-0000-0000-000000000001',
    2,
    1,
    '[
      {"type":"goal","player_id":"36000000-0000-0000-0000-000000000001","minute":12},
      {"type":"goal","player_id":"36000000-0000-0000-0000-000000000001","minute":78},
      {"type":"yellow_card","player_id":"36000000-0000-0000-0000-000000000001","minute":80}
    ]'::jsonb
  )$$,
  'completed match stores two goals and one card for one player'
);

select lives_ok(
  $$select public.complete_match_with_events(
    '46000000-0000-0000-0000-000000000002',
    0,
    1,
    '[]'::jsonb
  )$$,
  'previous season result is completed'
);

select is(
  (public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001')->'team'->>'matches_played')::integer,
  1,
  'current scope includes only completed matches'
);

select is(
  (public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001')->'team'->>'goals_scored')::integer,
  2,
  'team goals use completed scores'
);

select is(
  (select (row->>'goals')::integer
   from jsonb_array_elements(public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '36000000-0000-0000-0000-000000000001'),
  2,
  'two goal events remain two goals after independent aggregation'
);

select is(
  (select (row->>'yellow_cards')::integer
   from jsonb_array_elements(public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '36000000-0000-0000-0000-000000000001'),
  1,
  'one card is not multiplied by the two goal rows'
);

select is(
  (select (row->>'scoring_matches')::integer
   from jsonb_array_elements(public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '36000000-0000-0000-0000-000000000001'),
  1,
  'scoring matches count distinct matches'
);

select is(
  (select (row->>'multi_goal_matches')::integer
   from jsonb_array_elements(public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '36000000-0000-0000-0000-000000000001'),
  1,
  'multi-goal matches count one match with two goals'
);

select is(
  (select (row->>'matches_called_up')::integer
   from jsonb_array_elements(public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '36000000-0000-0000-0000-000000000001'),
  1,
  'completed call-ups count completed matches only'
);

select is(
  (select (row->>'total_matches_called_up')::integer
   from jsonb_array_elements(public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '36000000-0000-0000-0000-000000000001'),
  2,
  'career total call-ups includes both completed seasons'
);

select is(
  (select (row->>'total_matches_called_up')::integer
   from jsonb_array_elements(public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '36000000-0000-0000-0000-000000000002'),
  1,
  'scheduled call-up remains visible as a call-up'
);

select is(
  (select (row->>'matches_called_up')::integer
   from jsonb_array_elements(public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '36000000-0000-0000-0000-000000000002'),
  0,
  'scheduled call-up is not presented as completed participation'
);

select is(
  (select (row->>'status')
   from jsonb_array_elements(public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '36000000-0000-0000-0000-000000000003'),
  'inactive',
  'inactive players remain in historical projections'
);

select is(
  jsonb_array_length((public.get_player_statistics_detail('16000000-0000-0000-0000-000000000001', '36000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001'))->'recent_matches'),
  1,
  'detail returns recent completed called-up matches'
);

select is(
  jsonb_array_length((public.get_player_statistics_detail('16000000-0000-0000-0000-000000000001', '36000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001'))->'goal_history'),
  2,
  'detail returns normalized goal history'
);

select is(
  jsonb_array_length((public.get_player_statistics_detail('16000000-0000-0000-0000-000000000001', '36000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-000000000001'))->'discipline_history'),
  1,
  'detail returns normalized discipline history'
);

select throws_ok(
  $$select public.get_statistics_snapshot('96000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'statistics cannot be read for another team'
);

select throws_ok(
  $$select public.get_player_statistics_detail('16000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'player detail cannot read a foreign player'
);

select throws_ok(
  $$select public.get_statistics_snapshot('16000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-000000000001')$$,
  'P0002', null,
  'statistics rejects a foreign season'
);

select * from finish();
rollback;
