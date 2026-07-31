-- Match scheduling never owns result entry. Normalize any pre-feature
-- non-completed scores before making the lifecycle constraint exact.
update public.matches
set team_score = null,
    opponent_score = null
where status in ('scheduled', 'cancelled')
  and (team_score is not null or opponent_score is not null);

alter table public.matches
drop constraint matches_scores_paired_check,
drop constraint matches_completed_scores_check;

alter table public.matches
add constraint matches_score_state_check
check (
  (
    status in ('scheduled', 'cancelled')
    and team_score is null
    and opponent_score is null
  )
  or
  (
    status = 'completed'
    and team_score is not null
    and opponent_score is not null
  )
),
add constraint matches_opponent_name_length_check
check (char_length(btrim(opponent_name)) between 1 and 120),
add constraint matches_venue_length_check
check (venue is null or char_length(btrim(venue)) <= 160),
add constraint matches_notes_length_check
check (notes is null or char_length(notes) <= 2000);

create function public.guard_match_history()
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

revoke all on function public.guard_match_history() from public, anon, authenticated;
grant execute on function public.guard_match_history() to service_role;

create trigger matches_guard_history
before update on public.matches
for each row execute function public.guard_match_history();

drop policy matches_delete_owned on public.matches;

create function public.can_delete_owned_match(
  target_match_id uuid,
  target_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.teams
      where teams.id = target_team_id
        and teams.owner_id = (select auth.uid())
    )
    and not exists (
      select 1
      from public.callups
      where callups.match_id = target_match_id
    )
    and not exists (
      select 1
      from public.match_events
      where match_events.match_id = target_match_id
    );
$$;

revoke all on function public.can_delete_owned_match(uuid, uuid) from public, anon;
grant execute on function public.can_delete_owned_match(uuid, uuid)
to authenticated, service_role;

create policy matches_delete_eligible_owned
on public.matches
as permissive
for delete
to authenticated
using (
  status in ('scheduled', 'cancelled')
  and public.can_delete_owned_match(matches.id, matches.team_id)
);
