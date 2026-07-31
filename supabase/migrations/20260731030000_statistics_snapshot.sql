-- Task 014: expose derived statistics as one owner-scoped projection.
-- No player, team, or season totals are persisted.

create or replace function public.get_statistics_snapshot(
  target_team_id uuid,
  target_season_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  snapshot jsonb;
begin
  if not exists (
    select 1
    from public.teams
    where teams.id = target_team_id
      and teams.owner_id = (select auth.uid())
  ) then
    raise exception 'statistics_forbidden' using errcode = '42501';
  end if;

  if target_season_id is not null and not exists (
    select 1
    from public.seasons
    where seasons.id = target_season_id
      and seasons.team_id = target_team_id
  ) then
    raise exception 'statistics_season_not_found' using errcode = 'P0002';
  end if;

  with completed_matches as materialized (
    select
      matches.id,
      matches.season_id,
      matches.team_score,
      matches.opponent_score
    from public.matches
    where matches.team_id = target_team_id
      and matches.status = 'completed'
      and matches.team_score is not null
      and matches.opponent_score is not null
      and (
        target_season_id is null
        or matches.season_id = target_season_id
      )
  ),
  player_stats as (
    select
      players.id as player_id,
      players.first_name,
      players.last_name,
      players.nickname,
      players.shirt_number,
      players.position,
      count(distinct completed_matches.id)::integer as matches_called_up,
      count(distinct completed_matches.id) filter (
        where completed_matches.team_score > completed_matches.opponent_score
      )::integer as matches_won,
      count(distinct completed_matches.id) filter (
        where completed_matches.team_score = completed_matches.opponent_score
      )::integer as matches_drawn,
      count(distinct completed_matches.id) filter (
        where completed_matches.team_score < completed_matches.opponent_score
      )::integer as matches_lost,
      count(match_events.id) filter (where match_events.type = 'goal')::integer as goals,
      count(match_events.id) filter (where match_events.type = 'yellow_card')::integer as yellow_cards,
      count(match_events.id) filter (where match_events.type = 'red_card')::integer as red_cards
    from public.players
    left join public.callups
      on callups.team_id = players.team_id
      and callups.player_id = players.id
    left join completed_matches
      on completed_matches.id = callups.match_id
    left join public.match_events
      on match_events.team_id = players.team_id
      and match_events.player_id = players.id
      and match_events.match_id = completed_matches.id
    where players.team_id = target_team_id
    group by
      players.id,
      players.first_name,
      players.last_name,
      players.nickname,
      players.shirt_number,
      players.position
  ),
  team_totals as (
    select
      count(*)::integer as matches_played,
      count(*) filter (where team_score > opponent_score)::integer as wins,
      count(*) filter (where team_score = opponent_score)::integer as draws,
      count(*) filter (where team_score < opponent_score)::integer as losses,
      coalesce(sum(team_score), 0)::integer as goals_scored,
      coalesce(sum(opponent_score), 0)::integer as goals_conceded
    from completed_matches
  ),
  event_totals as (
    select
      count(match_events.id) filter (where match_events.type = 'yellow_card')::integer as yellow_cards,
      count(match_events.id) filter (where match_events.type = 'red_card')::integer as red_cards
    from public.match_events
    join completed_matches
      on completed_matches.id = match_events.match_id
    where match_events.team_id = target_team_id
  )
  select jsonb_build_object(
    'has_completed_matches', exists (select 1 from completed_matches),
    'team', (
      select jsonb_build_object(
        'matches_played', team_totals.matches_played,
        'wins', team_totals.wins,
        'draws', team_totals.draws,
        'losses', team_totals.losses,
        'goals_scored', team_totals.goals_scored,
        'goals_conceded', team_totals.goals_conceded,
        'goal_difference', team_totals.goals_scored - team_totals.goals_conceded,
        'yellow_cards', event_totals.yellow_cards,
        'red_cards', event_totals.red_cards
      )
      from team_totals, event_totals
    ),
    'players', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'player_id', player_stats.player_id,
            'first_name', player_stats.first_name,
            'last_name', player_stats.last_name,
            'nickname', player_stats.nickname,
            'shirt_number', player_stats.shirt_number,
            'position', player_stats.position,
            'matches_called_up', player_stats.matches_called_up,
            'matches_won', player_stats.matches_won,
            'matches_drawn', player_stats.matches_drawn,
            'matches_lost', player_stats.matches_lost,
            'goals', player_stats.goals,
            'yellow_cards', player_stats.yellow_cards,
            'red_cards', player_stats.red_cards
          )
          order by
            player_stats.goals desc,
            player_stats.yellow_cards desc,
            player_stats.red_cards desc,
            lower(player_stats.first_name || ' ' || coalesce(player_stats.last_name, '')),
            player_stats.player_id
        )
        from player_stats
      ),
      '[]'::jsonb
    )
  )
  into snapshot;

  return snapshot;
end;
$$;

revoke all on function public.get_statistics_snapshot(uuid, uuid)
from public, anon;
grant execute on function public.get_statistics_snapshot(uuid, uuid)
to authenticated;
