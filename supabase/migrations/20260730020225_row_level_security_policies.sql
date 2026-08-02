-- Supabase projects created after May 2026 do not expose new tables to the
-- Data API automatically. Keep anonymous access closed and explicitly expose
-- the application tables only to authenticated clients and the service role.
revoke all privileges on table
  public.teams,
  public.seasons,
  public.players,
  public.matches,
  public.callups,
  public.match_events
from anon;

grant select, insert, update, delete on table
  public.teams,
  public.seasons,
  public.players,
  public.matches,
  public.callups,
  public.match_events
to authenticated, service_role;

-- teams: teams.owner_id is the ownership root for the entire data graph.
create policy teams_select_owned
on public.teams
as permissive
for select
to authenticated
using (owner_id = (select auth.uid()));

create policy teams_insert_owned
on public.teams
as permissive
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy teams_update_owned
on public.teams
as permissive
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy teams_delete_owned
on public.teams
as permissive
for delete
to authenticated
using (owner_id = (select auth.uid()));

-- seasons: ownership is derived through seasons.team_id -> teams.id.
create policy seasons_select_owned
on public.seasons
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.teams
    where teams.id = seasons.team_id
      and teams.owner_id = (select auth.uid())
  )
);

create policy seasons_insert_owned
on public.seasons
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.teams
    where teams.id = seasons.team_id
      and teams.owner_id = (select auth.uid())
  )
);

create policy seasons_update_owned
on public.seasons
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from public.teams
    where teams.id = seasons.team_id
      and teams.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.teams
    where teams.id = seasons.team_id
      and teams.owner_id = (select auth.uid())
  )
);

create policy seasons_delete_owned
on public.seasons
as permissive
for delete
to authenticated
using (
  exists (
    select 1
    from public.teams
    where teams.id = seasons.team_id
      and teams.owner_id = (select auth.uid())
  )
);

-- players: ownership is derived through players.team_id -> teams.id.
create policy players_select_owned
on public.players
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.teams
    where teams.id = players.team_id
      and teams.owner_id = (select auth.uid())
  )
);

create policy players_insert_owned
on public.players
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.teams
    where teams.id = players.team_id
      and teams.owner_id = (select auth.uid())
  )
);

create policy players_update_owned
on public.players
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from public.teams
    where teams.id = players.team_id
      and teams.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.teams
    where teams.id = players.team_id
      and teams.owner_id = (select auth.uid())
  )
);

create policy players_delete_owned
on public.players
as permissive
for delete
to authenticated
using (
  exists (
    select 1
    from public.teams
    where teams.id = players.team_id
      and teams.owner_id = (select auth.uid())
  )
);

-- matches: ownership is derived through matches.team_id -> teams.id.
create policy matches_select_owned
on public.matches
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.teams
    where teams.id = matches.team_id
      and teams.owner_id = (select auth.uid())
  )
);

create policy matches_insert_owned
on public.matches
as permissive
for insert
to authenticated
with check (
  exists (
    select 1
    from public.teams
    where teams.id = matches.team_id
      and teams.owner_id = (select auth.uid())
  )
);

create policy matches_update_owned
on public.matches
as permissive
for update
to authenticated
using (
  exists (
    select 1
    from public.teams
    where teams.id = matches.team_id
      and teams.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.teams
    where teams.id = matches.team_id
      and teams.owner_id = (select auth.uid())
  )
);

create policy matches_delete_owned
on public.matches
as permissive
for delete
to authenticated
using (
  exists (
    select 1
    from public.teams
    where teams.id = matches.team_id
      and teams.owner_id = (select auth.uid())
  )
);

-- callups: authorize through the referenced match, never the submitted team_id.
create policy callups_select_owned
on public.callups
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = callups.match_id
      and teams.owner_id = (select auth.uid())
  )
);

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
      and teams.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = callups.match_id
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
      and teams.owner_id = (select auth.uid())
  )
);

-- match_events: authorize through the referenced match, never the submitted
-- team_id or player identifiers.
create policy match_events_select_owned
on public.match_events
as permissive
for select
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_events.match_id
      and teams.owner_id = (select auth.uid())
  )
);

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
      and teams.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.matches
    join public.teams on teams.id = matches.team_id
    where matches.id = match_events.match_id
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
      and teams.owner_id = (select auth.uid())
  )
);
