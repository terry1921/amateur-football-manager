-- The MVP gives each authenticated owner one team. Enforce that invariant so
-- two onboarding submissions cannot create duplicate teams concurrently.
create unique index teams_owner_unique_idx on public.teams (owner_id);
