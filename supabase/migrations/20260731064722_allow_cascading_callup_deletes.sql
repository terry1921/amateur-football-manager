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

  -- A cascading match deletion removes the parent before deleting its call-ups.
  -- The foreign key guarantees a missing parent cannot occur for a direct delete.
  if tg_op = 'DELETE' and not found then
    return old;
  end if;

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
