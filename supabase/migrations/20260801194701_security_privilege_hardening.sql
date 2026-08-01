-- RLS is the row boundary; table ACLs should still grant only the operations
-- that the Data API needs. In particular, authenticated must not retain
-- TRUNCATE, TRIGGER, or REFERENCES from a broader inherited grant.
revoke all privileges on table
  public.teams,
  public.seasons,
  public.players,
  public.matches,
  public.callups,
  public.match_events
from authenticated;

grant select, insert, update on table
  public.seasons,
  public.players
to authenticated;

grant select, insert, update, delete on table
  public.teams,
  public.matches,
  public.callups,
  public.match_events
to authenticated;
