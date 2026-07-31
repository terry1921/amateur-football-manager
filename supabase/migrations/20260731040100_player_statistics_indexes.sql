-- Task 015: support player history reads without broad event scans.
create index if not exists match_events_player_type_match_idx
  on public.match_events(player_id, type, match_id);
