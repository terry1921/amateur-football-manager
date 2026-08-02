-- Matchday RC1 development/demo seed.
--
-- This file is local-only and disabled during the default `db reset`; never
-- run it against a hosted production project. All values are synthetic and
-- use reserved IDs.
-- The demo auth record intentionally has no usable password. Create a normal
-- local account through the app when testing authenticated screens.


insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'demo@matchday.test',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.teams (
  id,
  owner_id,
  name,
  short_name,
  slug,
  primary_color,
  secondary_color,
  city,
  country
)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Demo United',
  'DU',
  'demo-united',
  '#071a36',
  '#00a331',
  'Demo City',
  'Mexico'
)
on conflict (id) do nothing;

insert into public.seasons (id, team_id, name, start_date, end_date, status)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Demo Season 2026',
  '2026-07-01',
  '2026-12-31',
  'active'
)
on conflict (id) do nothing;

insert into public.players (
  id,
  team_id,
  first_name,
  last_name,
  nickname,
  shirt_number,
  position,
  status
)
values
  ('21000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Alex', 'North', null, 1, 'GK', 'active'),
  ('21000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Jordan', 'Reyes', null, 4, 'DEF', 'active'),
  ('21000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Sam', 'Rivera', null, 8, 'MID', 'active'),
  ('21000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Taylor', 'Cruz', null, 9, 'FWD', 'active'),
  ('21000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Casey', 'Lopez', null, 11, 'FWD', 'active'),
  ('21000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Morgan', 'Diaz', null, 14, 'MID', 'active'),
  ('21000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'Riley', 'Soto', null, 17, 'DEF', 'active'),
  ('21000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 'Avery', 'Mendez', null, 22, 'GK', 'active')
on conflict (id) do nothing;

insert into public.matches (
  id,
  team_id,
  season_id,
  opponent_name,
  competition,
  round,
  venue,
  kickoff_at,
  home_away,
  status,
  team_score,
  opponent_score,
  notes
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Harbor Rovers',
    'Demo League',
    'Matchday 1',
    'Demo Park',
    '2026-07-26 10:00:00-06',
    'home',
    'scheduled',
    null,
    null,
    'Synthetic completed match for local verification.'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Valley Athletic',
    'Demo League',
    'Matchday 2',
    'Valley Field',
    '2026-09-06 10:00:00-06',
    'away',
    'scheduled',
    null,
    null,
    'Synthetic upcoming fixture for local verification.'
  )
on conflict (id) do nothing;

insert into public.callups (id, team_id, match_id, player_id, status)
values
  ('31000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'confirmed'),
  ('31000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000002', 'confirmed'),
  ('31000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000003', 'confirmed'),
  ('31000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000004', 'confirmed'),
  ('31000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', 'called_up'),
  ('31000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000003', 'called_up'),
  ('31000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000004', 'called_up')
on conflict (id) do nothing;

insert into public.match_events (
  id,
  team_id,
  match_id,
  player_id,
  type,
  minute,
  stoppage_time,
  notes
)
values
  ('32000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000004', 'goal', 12, 0, null),
  ('32000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000003', 'goal', 41, 2, 'Synthetic stoppage-time example.'),
  ('32000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'goal', 70, 0, null),
  ('32000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000002', 'yellow_card', 55, 0, null)
on conflict (id) do nothing;

-- Seed the historical fixture through the same guarded state transition used
-- by the result transaction. The synthetic events above already reconcile to
-- this score; no production client can set this local-only transaction flag.
select set_config('matchday.allow_result_completion', 'on', false);

update public.matches
set status = 'completed',
    team_score = 3,
    opponent_score = 1
where id = '30000000-0000-0000-0000-000000000001';
