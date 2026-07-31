-- Cover the composite event -> call-up foreign key and the player event join.

create index if not exists match_events_team_match_player_idx
  on public.match_events (team_id, match_id, player_id);
