-- A match result is a domain transaction. Direct table writes must not be
-- able to skip event validation and score-to-goal reconciliation.
create or replace function public.guard_match_result_entry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'service_role' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' and new.status = 'completed' then
    raise exception 'match_completion_requires_result_transaction'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'scheduled'
    and new.status = 'completed'
    and current_setting('matchday.allow_result_completion', true) <> 'on'
  then
    raise exception 'match_completion_requires_result_transaction'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_match_result_entry() from public, anon, authenticated;
grant execute on function public.guard_match_result_entry() to service_role;

create trigger matches_guard_result_entry
before insert or update on public.matches
for each row execute function public.guard_match_result_entry();

create or replace function public.complete_match_with_events(
  target_match_id uuid,
  final_team_score integer,
  final_opponent_score integer,
  event_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_team_id uuid;
  target_status text;
  goal_count bigint;
  event_count bigint;
  event_row jsonb;
begin
  perform set_config('matchday.allow_result_completion', 'on', true);

  select matches.team_id, matches.status
  into target_team_id, target_status
  from public.matches
  where matches.id = target_match_id
  for update;

  if not found then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.teams
    where teams.id = target_team_id
      and teams.owner_id = (select auth.uid())
  ) then
    raise exception 'match_forbidden' using errcode = '42501';
  end if;

  if target_status <> 'scheduled' then
    raise exception 'match_not_scheduled' using errcode = '55000';
  end if;

  if final_team_score is null
    or final_opponent_score is null
    or final_team_score < 0
    or final_opponent_score < 0
  then
    raise exception 'invalid_match_score' using errcode = '22023';
  end if;

  if event_rows is null or jsonb_typeof(event_rows) <> 'array' then
    raise exception 'invalid_event_payload' using errcode = '22023';
  end if;

  select count(*)
  into event_count
  from jsonb_array_elements(event_rows);

  if event_count > 250 then
    raise exception 'too_many_match_events' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(event_rows) as rows(value)
    where jsonb_typeof(rows.value) <> 'object'
  ) then
    raise exception 'invalid_event_payload' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(event_rows) as rows(value),
      lateral jsonb_object_keys(rows.value) as keys(key)
    where keys.key not in ('type', 'player_id', 'minute')
  ) then
    raise exception 'unsupported_event_field' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(event_rows) as rows(value)
    where not (
      rows.value ? 'type'
      and rows.value ? 'player_id'
      and rows.value ? 'minute'
    )
    or jsonb_typeof(rows.value->'type') <> 'string'
    or jsonb_typeof(rows.value->'player_id') <> 'string'
    or jsonb_typeof(rows.value->'minute') <> 'number'
    or rows.value->>'type' not in ('goal', 'yellow_card', 'red_card')
    or rows.value->>'player_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or rows.value->>'minute' !~ '^[0-9]+$'
    or case
      when rows.value->>'minute' ~ '^[0-9]+$'
        then (rows.value->>'minute')::numeric
      else -1
    end > 2147483647
  ) then
    raise exception 'invalid_event_payload' using errcode = '22023';
  end if;

  select count(*)
  into goal_count
  from jsonb_array_elements(event_rows) as rows(value)
  where rows.value->>'type' = 'goal';

  if goal_count <> final_team_score then
    raise exception 'goal_count_mismatch' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(event_rows) as rows(value)
    where not exists (
      select 1
      from public.callups
      where callups.team_id = target_team_id
        and callups.match_id = target_match_id
        and callups.player_id = (rows.value->>'player_id')::uuid
    )
  ) then
    raise exception 'event_player_not_called_up' using errcode = '23503';
  end if;

  delete from public.match_events
  where match_events.team_id = target_team_id
    and match_events.match_id = target_match_id;

  insert into public.match_events (
    team_id,
    match_id,
    player_id,
    type,
    minute
  )
  select
    target_team_id,
    target_match_id,
    (rows.value->>'player_id')::uuid,
    rows.value->>'type',
    (rows.value->>'minute')::integer
  from jsonb_array_elements(event_rows) as rows(value);

  update public.matches
  set status = 'completed',
      team_score = final_team_score,
      opponent_score = final_opponent_score
  where matches.id = target_match_id
    and matches.team_id = target_team_id
    and matches.status = 'scheduled';

  if not found then
    raise exception 'match_completion_conflict' using errcode = '55000';
  end if;

  return jsonb_build_object(
    'match_id', target_match_id,
    'status', 'completed',
    'team_score', final_team_score,
    'opponent_score', final_opponent_score,
    'event_count', event_count
  );
end;
$$;

revoke all on function public.complete_match_with_events(uuid, integer, integer, jsonb)
from public, anon;
grant execute on function public.complete_match_with_events(uuid, integer, integer, jsonb)
to authenticated, service_role;
