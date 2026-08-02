-- A player leaving the team is a lifecycle change, never a history deletion.
drop policy if exists players_delete_owned on public.players;
revoke delete on table public.players from authenticated;

create or replace function public.guard_player_team_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.team_id is distinct from old.team_id then
    raise exception 'A player cannot be moved to another team'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_player_team_identity() from public, anon, authenticated;
grant execute on function public.guard_player_team_identity() to service_role;

create trigger guard_player_team_identity
before update on public.players
for each row execute function public.guard_player_team_identity();
