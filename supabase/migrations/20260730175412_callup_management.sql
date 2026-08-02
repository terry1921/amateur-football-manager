create or replace function public.guard_callup_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_match_status text;
  target_player_status text;
begin
  if current_user = 'service_role' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' and (
    new.team_id is distinct from old.team_id
    or new.match_id is distinct from old.match_id
    or new.player_id is distinct from old.player_id
  ) then
    raise exception 'callup_identity_is_immutable' using errcode = '55000';
  end if;

  select matches.status
  into target_match_status
  from public.matches
  where matches.id = case when tg_op = 'DELETE' then old.match_id else new.match_id end
    and matches.team_id = case when tg_op = 'DELETE' then old.team_id else new.team_id end;

  if target_match_status is distinct from 'scheduled' then
    raise exception 'callup_is_read_only' using errcode = '55000';
  end if;

  if tg_op = 'INSERT' then
    select players.status
    into target_player_status
    from public.players
    where players.id = new.player_id
      and players.team_id = new.team_id;

    if target_player_status is distinct from 'active' then
      raise exception 'callup_player_is_not_eligible' using errcode = '22023';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.guard_callup_lifecycle() from public, anon, authenticated;
grant execute on function public.guard_callup_lifecycle() to service_role;

create trigger callups_guard_lifecycle
before insert or update or delete on public.callups
for each row execute function public.guard_callup_lifecycle();

drop policy if exists callups_insert_owned on public.callups;
drop policy if exists callups_update_owned on public.callups;
drop policy if exists callups_delete_owned on public.callups;

create policy callups_insert_owned
on public.callups
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = callups.match_id
      and matches.team_id = callups.team_id
      and matches.status = 'scheduled'
      and teams.owner_id = (select auth.uid())
  )
);

create policy callups_update_owned
on public.callups
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = callups.match_id
      and matches.team_id = callups.team_id
      and matches.status = 'scheduled'
      and teams.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = callups.match_id
      and matches.team_id = callups.team_id
      and matches.status = 'scheduled'
      and teams.owner_id = (select auth.uid())
  )
);

create policy callups_delete_owned
on public.callups
as permissive
for delete
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = callups.match_id
      and matches.team_id = callups.team_id
      and matches.status = 'scheduled'
      and teams.owner_id = (select auth.uid())
  )
);

create or replace function public.replace_match_callup(
  target_match_id uuid,
  selected_player_ids uuid[]
)
returns setof public.callups
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_team_id uuid;
  target_status text;
  normalized_player_ids uuid[] := coalesce(selected_player_ids, array[]::uuid[]);
  eligible_player_count bigint;
begin
  select matches.team_id, matches.status
  into target_team_id, target_status
  from public.matches
  where matches.id = target_match_id
  for update;

  if not found then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;

  if target_status <> 'scheduled' then
    raise exception 'callup_is_read_only' using errcode = '55000';
  end if;

  if cardinality(normalized_player_ids) <> (
    select count(distinct candidate.player_id)
    from unnest(normalized_player_ids) as candidate(player_id)
  ) then
    raise exception 'duplicate_callup_player' using errcode = '22023';
  end if;

  select count(*)
  into eligible_player_count
  from public.players
  where players.team_id = target_team_id
    and players.id = any(normalized_player_ids)
    and (
      players.status = 'active'
      or exists (
        select 1
        from public.callups
        where callups.match_id = target_match_id
          and callups.player_id = players.id
      )
    );

  if eligible_player_count <> cardinality(normalized_player_ids) then
    raise exception 'callup_contains_ineligible_player' using errcode = '22023';
  end if;

  delete from public.callups
  where callups.match_id = target_match_id
    and not (callups.player_id = any(normalized_player_ids));

  insert into public.callups (team_id, match_id, player_id)
  select target_team_id, target_match_id, candidate.player_id
  from unnest(normalized_player_ids) as candidate(player_id)
  where not exists (
    select 1
    from public.callups
    where callups.match_id = target_match_id
      and callups.player_id = candidate.player_id
  );

  update public.callups
  set updated_at = now()
  where callups.match_id = target_match_id;

  return query
  select callups.*
  from public.callups
  where callups.match_id = target_match_id
  order by callups.player_id;
end;
$$;

revoke all on function public.replace_match_callup(uuid, uuid[]) from public, anon;
grant execute on function public.replace_match_callup(uuid, uuid[]) to authenticated, service_role;
