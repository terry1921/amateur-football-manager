-- A client-generated key makes an uncertain retry of match creation safe.
-- It is nullable so existing rows and non-form integrations remain compatible.
alter table public.matches
  add column creation_key uuid;

create unique index matches_team_creation_key_unique_idx
  on public.matches (team_id, creation_key)
  where creation_key is not null;
