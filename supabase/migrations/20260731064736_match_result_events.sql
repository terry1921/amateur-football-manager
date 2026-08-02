-- Task 012.5: make match events match-time facts and complete the result in
-- one database transaction. The existing normalized event table remains the
-- source of truth; no totals or JSON event blobs are introduced.

alter table public.callups
  add constraint callups_team_match_player_key
  unique (team_id, match_id, player_id);

alter table public.match_events
  add constraint match_events_team_match_player_callup_fkey
  foreign key (team_id, match_id, player_id)
  references public.callups (team_id, match_id, player_id)
  on delete no action
  deferrable initially deferred;

alter table public.match_events
  drop constraint match_events_minute_check,
  add constraint match_events_minute_check
    check (minute is not null and minute >= 0);

create or replace function public.guard_match_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.team_id is distinct from old.team_id then
    raise exception 'match_team_is_immutable' using errcode = '55000';
  end if;

  if old.status in ('completed', 'cancelled') and new is distinct from old then
    raise exception 'historical_match_is_immutable' using errcode = '55000';
  end if;

  if old.status = 'scheduled'
    and new.status = 'cancelled'
    and exists (
      select 1
      from public.match_events
      where match_events.team_id = old.team_id
        and match_events.match_id = old.id
    )
  then
    raise exception 'match_with_events_is_not_cancellable' using errcode = '55000';
  end if;

  if new.status is distinct from old.status
    and not (
      old.status = 'scheduled'
      and new.status in ('completed', 'cancelled')
    )
  then
    raise exception 'invalid_match_status_transition' using errcode = '22023';
  end if;

  return new;
end;
$$;

create or replace function public.guard_match_event_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_match_id uuid;
  target_team_id uuid;
  target_match_status text;
begin
  if current_user = 'service_role' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  target_match_id := case when tg_op = 'DELETE' then old.match_id else new.match_id end;
  target_team_id := case when tg_op = 'DELETE' then old.team_id else new.team_id end;

  select matches.status
  into target_match_status
  from public.matches
  where matches.id = target_match_id
    and matches.team_id = target_team_id;

  if target_match_status is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if target_match_status is distinct from 'scheduled' then
    raise exception 'match_event_is_read_only' using errcode = '55000';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.guard_match_event_history() from public, anon, authenticated;
grant execute on function public.guard_match_event_history() to service_role;

create trigger match_events_guard_history
before insert or update or delete on public.match_events
for each row execute function public.guard_match_event_history();

drop policy if exists match_events_insert_owned on public.match_events;
drop policy if exists match_events_update_owned on public.match_events;
drop policy if exists match_events_delete_owned on public.match_events;

create policy match_events_insert_owned
on public.match_events
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_events.match_id
      and matches.team_id = match_events.team_id
      and matches.status = 'scheduled'
      and teams.owner_id = (select auth.uid())
  )
);

create policy match_events_update_owned
on public.match_events
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_events.match_id
      and matches.team_id = match_events.team_id
      and matches.status = 'scheduled'
      and teams.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_events.match_id
      and matches.team_id = match_events.team_id
      and matches.status = 'scheduled'
      and teams.owner_id = (select auth.uid())
  )
);

create policy match_events_delete_owned
on public.match_events
as permissive
for delete
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_events.match_id
      and matches.team_id = match_events.team_id
      and matches.status = 'scheduled'
      and teams.owner_id = (select auth.uid())
  )
);

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
