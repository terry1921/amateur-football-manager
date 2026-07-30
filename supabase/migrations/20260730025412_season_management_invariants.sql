create unique index seasons_team_name_unique_idx
on public.seasons (team_id, lower(btrim(name)));

alter table public.seasons
add constraint seasons_name_length_check
check (char_length(btrim(name)) between 1 and 80);

drop policy seasons_delete_owned on public.seasons;
revoke delete on table public.seasons from authenticated;

create or replace function public.guard_season_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.team_id is distinct from old.team_id then
    raise exception 'season_team_is_immutable' using errcode = '55000';
  end if;

  if old.status = 'completed' and new is distinct from old then
    raise exception 'completed_season_is_immutable' using errcode = '55000';
  end if;

  if new.status is distinct from old.status
    and not (
      (old.status = 'draft' and new.status in ('active', 'completed'))
      or (old.status = 'active' and new.status = 'completed')
    )
  then
    raise exception 'invalid_season_status_transition' using errcode = '22023';
  end if;

  if (
    new.name is distinct from old.name
    or new.start_date is distinct from old.start_date
    or new.end_date is distinct from old.end_date
  ) and exists (
    select 1
    from public.matches
    where matches.team_id = old.team_id
      and matches.season_id = old.id
  ) then
    raise exception 'season_with_matches_is_immutable' using errcode = '55000';
  end if;

  return new;
end;
$$;

create trigger seasons_guard_history
before update on public.seasons
for each row
execute function public.guard_season_history();

create or replace function public.activate_season(target_season_id uuid)
returns public.seasons
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.seasons;
begin
  select seasons.*
  into target
  from public.seasons
  where seasons.id = target_season_id
  for update;

  if not found then
    raise exception 'season_not_found' using errcode = 'P0002';
  end if;

  if target.status = 'completed' then
    raise exception 'completed_season_cannot_be_activated' using errcode = '22023';
  end if;

  if target.status = 'active' then
    return target;
  end if;

  update public.seasons
  set status = 'completed'
  where team_id = target.team_id
    and status = 'active'
    and id <> target.id;

  update public.seasons
  set status = 'active'
  where id = target.id
  returning * into target;

  return target;
end;
$$;

revoke all on function public.guard_season_history() from public, anon, authenticated;
grant execute on function public.guard_season_history() to service_role;

revoke all on function public.activate_season(uuid) from public, anon;
grant execute on function public.activate_season(uuid) to authenticated, service_role;
