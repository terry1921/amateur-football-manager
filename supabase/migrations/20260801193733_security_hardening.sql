-- The delete predicate only reads RLS-visible tenant rows. Invoker security
-- keeps it out of the authenticated RPC surface as a privilege-escalation
-- primitive while the policy continues to enforce ownership.
create or replace function public.can_delete_owned_match(
  target_match_id uuid,
  target_team_id uuid
)
returns boolean
language sql
stable
security invoker
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
