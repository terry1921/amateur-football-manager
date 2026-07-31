-- Task 014: keep the bounded statistics projection selective by tenant,
-- season, lifecycle status, and normalized event type.

create index if not exists matches_team_season_status_idx
  on public.matches (team_id, season_id, status);

create index if not exists match_events_team_match_type_idx
  on public.match_events (team_id, match_id, type);
