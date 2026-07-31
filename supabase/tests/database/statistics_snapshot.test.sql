begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email)
values ('05000000-0000-0000-0000-000000000001', 'statistics@example.test');

insert into public.teams (id, owner_id, name, slug)
values ('15000000-0000-0000-0000-000000000001', '05000000-0000-0000-0000-000000000001', 'Statistics Team', 'statistics-team');

insert into public.seasons (id, team_id, name, status)
values
  ('25000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', 'Current Season', 'active'),
  ('25000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000001', 'Previous Season', 'completed');

insert into public.players (id, team_id, first_name, last_name, position)
values
  ('35000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', 'Top', 'Scorer', 'FWD'),
  ('35000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000001', 'Card', 'Leader', 'DEF');

insert into public.matches (id, team_id, season_id, opponent_name, kickoff_at, home_away)
values
  ('45000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001', 'Current Opponent', '2026-09-10 18:00:00+00', 'home'),
  ('45000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000002', 'Previous Opponent', '2026-06-10 18:00:00+00', 'away');

insert into public.callups (team_id, match_id, player_id)
values
  ('15000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000001', '35000000-0000-0000-0000-000000000001'),
  ('15000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000001', '35000000-0000-0000-0000-000000000002'),
  ('15000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000002', '35000000-0000-0000-0000-000000000001');

select set_config('request.jwt.claim.sub', '05000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select public.complete_match_with_events(
    '45000000-0000-0000-0000-000000000001',
    2,
    1,
    '[
      {"type":"goal","player_id":"35000000-0000-0000-0000-000000000001","minute":12},
      {"type":"goal","player_id":"35000000-0000-0000-0000-000000000001","minute":78},
      {"type":"yellow_card","player_id":"35000000-0000-0000-0000-000000000002","minute":80}
    ]'::jsonb
  )$$,
  'current season result is recorded atomically'
);

select lives_ok(
  $$select public.complete_match_with_events(
    '45000000-0000-0000-0000-000000000002',
    0,
    1,
    '[]'::jsonb
  )$$,
  'previous season result is recorded atomically'
);

select is(
  (public.get_statistics_snapshot('15000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001')->'team'->>'matches_played')::integer,
  1,
  'season filter excludes previous matches'
);

select is(
  (public.get_statistics_snapshot('15000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001')->'team'->>'goals_scored')::integer,
  2,
  'team goals scored come from completed scores'
);

select is(
  (public.get_statistics_snapshot('15000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001')->'team'->>'goals_conceded')::integer,
  1,
  'team goals conceded use the managed score orientation'
);

select is(
  (select (row->>'goals')::integer
   from jsonb_array_elements(public.get_statistics_snapshot('15000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '35000000-0000-0000-0000-000000000001'),
  2,
  'player goals are counted from normalized goal events'
);

select is(
  (select (row->>'yellow_cards')::integer
   from jsonb_array_elements(public.get_statistics_snapshot('15000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '35000000-0000-0000-0000-000000000002'),
  1,
  'player cards are counted from normalized card events'
);

select is(
  (select (row->>'matches_won')::integer
   from jsonb_array_elements(public.get_statistics_snapshot('15000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001')->'players') row
   where row->>'player_id' = '35000000-0000-0000-0000-000000000001'),
  1,
  'player result record follows completed match scores'
);

select is(
  (public.get_statistics_snapshot('15000000-0000-0000-0000-000000000001')->'team'->>'matches_played')::integer,
  2,
  'career filter includes every completed season'
);

select is(
  (public.get_statistics_snapshot('15000000-0000-0000-0000-000000000001')->'team'->>'yellow_cards')::integer,
  1,
  'team cards are aggregated from normalized events'
);

select throws_ok(
  $$select public.get_statistics_snapshot('95000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'statistics cannot be read for another team'
);

select is(
  (public.get_statistics_snapshot('15000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001')->>'has_completed_matches')::boolean,
  true,
  'snapshot exposes whether completed history exists'
);

select * from finish();
rollback;
