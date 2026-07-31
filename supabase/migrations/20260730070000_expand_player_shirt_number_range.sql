alter table public.players
  drop constraint players_shirt_number_check;

alter table public.players
  add constraint players_shirt_number_check
  check (shirt_number is null or shirt_number between 0 and 999);
