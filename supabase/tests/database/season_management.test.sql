begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

select has_function(
  'public',
  'activate_season',
  array['uuid'],
  'season activation is exposed as one database transaction'
);

select function_privs_are(
  'public',
  'activate_season',
  array['uuid'],
  'authenticated',
  array['EXECUTE'],
  'authenticated users can execute season activation'
);

select function_privs_are(
  'public',
  'activate_season',
  array['uuid'],
  'anon',
  array[]::text[],
  'anonymous users cannot execute season activation'
);

select isnt_definer(
  'public',
  'activate_season',
  array['uuid'],
  'season activation uses invoker security and therefore RLS'
);

select has_index(
  'public',
  'seasons',
  'seasons_team_name_unique_idx',
  'season names have a race-safe tenant unique index'
);

select ok(
  not has_table_privilege('authenticated', 'public.seasons', 'DELETE'),
  'authenticated users cannot delete historical seasons'
);

insert into auth.users (id, email)
values
  ('01000000-0000-0000-0000-000000000001', 'season-owner-a@example.test'),
  ('01000000-0000-0000-0000-000000000002', 'season-owner-b@example.test');

insert into public.teams (id, owner_id, name, slug)
values
  ('11000000-0000-0000-0000-000000000001', '01000000-0000-0000-0000-000000000001', 'Season Team A', 'season-team-a'),
  ('11000000-0000-0000-0000-000000000002', '01000000-0000-0000-0000-000000000002', 'Season Team B', 'season-team-b');

insert into public.seasons (id, team_id, name, status)
values
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Apertura 2026', 'active'),
  ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'Clausura 2026', 'draft'),
  ('21000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000002', 'Foreign Season', 'draft');

select throws_ok(
  $$insert into public.seasons (team_id, name) values ('11000000-0000-0000-0000-000000000001', '  APERTURA 2026 ')$$,
  '23505',
  null,
  'duplicate names are rejected case-insensitively after trimming'
);

select set_config('request.jwt.claim.sub', '01000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select lives_ok(
  $$select public.activate_season('21000000-0000-0000-0000-000000000002')$$,
  'an owner can activate their draft season'
);

select results_eq(
  $$select name, status from public.seasons where team_id = '11000000-0000-0000-0000-000000000001' order by name$$,
  $$values ('Apertura 2026'::text, 'completed'::text), ('Clausura 2026'::text, 'active'::text)$$,
  'activation completes the previous active season before activating the draft'
);

select throws_ok(
  $$select public.activate_season('21000000-0000-0000-0000-000000000003')$$,
  'P0002',
  null,
  'RLS prevents activating another tenant season by known UUID'
);

select throws_ok(
  $$update public.seasons set name = 'Changed history' where id = '21000000-0000-0000-0000-000000000001'$$,
  '55000',
  null,
  'completed seasons are immutable historical records'
);

reset role;

select * from finish();
rollback;
