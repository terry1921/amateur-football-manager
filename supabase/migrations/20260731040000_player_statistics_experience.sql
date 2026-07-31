-- Task 015: specialize the Task 014 projection for player-centric views.
-- Call-ups, goals, and cards are aggregated independently before joining so
-- event rows can never multiply participation counts.

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
  callup_totals as (
    select
      callups.player_id,
      count(distinct callups.match_id)::integer as total_matches_called_up
    from public.callups
    join public.matches
      on matches.id = callups.match_id
      and matches.team_id = callups.team_id
    where callups.team_id = target_team_id
      and matches.status <> 'cancelled'
      and (
        target_season_id is null
        or matches.season_id = target_season_id
      )
    group by callups.player_id
  ),
  completed_callup_totals as (
    select
      callups.player_id,
      count(distinct completed_matches.id)::integer as matches_called_up,
      count(distinct completed_matches.id) filter (
        where completed_matches.team_score > completed_matches.opponent_score
      )::integer as matches_won,
      count(distinct completed_matches.id) filter (
        where completed_matches.team_score = completed_matches.opponent_score
      )::integer as matches_drawn,
      count(distinct completed_matches.id) filter (
        where completed_matches.team_score < completed_matches.opponent_score
      )::integer as matches_lost
    from public.callups
    join completed_matches
      on completed_matches.id = callups.match_id
    where callups.team_id = target_team_id
    group by callups.player_id
  ),
  goal_match_totals as (
    select
      match_events.player_id,
      match_events.match_id,
      count(*)::integer as goal_count
    from public.match_events
    join completed_matches
      on completed_matches.id = match_events.match_id
    where match_events.team_id = target_team_id
      and match_events.type = 'goal'
    group by match_events.player_id, match_events.match_id
  ),
  goal_totals as (
    select
      goal_match_totals.player_id,
      sum(goal_match_totals.goal_count)::integer as goals,
      count(*)::integer as scoring_matches,
      count(*) filter (where goal_match_totals.goal_count >= 2)::integer as multi_goal_matches
    from goal_match_totals
    group by goal_match_totals.player_id
  ),
  card_totals as (
    select
      match_events.player_id,
      count(*) filter (where match_events.type = 'yellow_card')::integer as yellow_cards,
      count(*) filter (where match_events.type = 'red_card')::integer as red_cards
    from public.match_events
    join completed_matches
      on completed_matches.id = match_events.match_id
    where match_events.team_id = target_team_id
      and match_events.type in ('yellow_card', 'red_card')
    group by match_events.player_id
  ),
  player_stats as (
    select
      players.id as player_id,
      players.first_name,
      players.last_name,
      players.nickname,
      players.shirt_number,
      players.position,
      players.status,
      coalesce(callup_totals.total_matches_called_up, 0) as total_matches_called_up,
      coalesce(completed_callup_totals.matches_called_up, 0) as matches_called_up,
      coalesce(completed_callup_totals.matches_won, 0) as matches_won,
      coalesce(completed_callup_totals.matches_drawn, 0) as matches_drawn,
      coalesce(completed_callup_totals.matches_lost, 0) as matches_lost,
      coalesce(goal_totals.goals, 0) as goals,
      coalesce(goal_totals.scoring_matches, 0) as scoring_matches,
      coalesce(goal_totals.multi_goal_matches, 0) as multi_goal_matches,
      coalesce(card_totals.yellow_cards, 0) as yellow_cards,
      coalesce(card_totals.red_cards, 0) as red_cards
    from public.players
    left join callup_totals
      on callup_totals.player_id = players.id
    left join completed_callup_totals
      on completed_callup_totals.player_id = players.id
    left join goal_totals
      on goal_totals.player_id = players.id
    left join card_totals
      on card_totals.player_id = players.id
    where players.team_id = target_team_id
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
            'status', player_stats.status,
            'total_matches_called_up', player_stats.total_matches_called_up,
            'matches_called_up', player_stats.matches_called_up,
            'matches_won', player_stats.matches_won,
            'matches_drawn', player_stats.matches_drawn,
            'matches_lost', player_stats.matches_lost,
            'goals', player_stats.goals,
            'scoring_matches', player_stats.scoring_matches,
            'multi_goal_matches', player_stats.multi_goal_matches,
            'yellow_cards', player_stats.yellow_cards,
            'red_cards', player_stats.red_cards
          )
          order by
            player_stats.goals desc,
            player_stats.red_cards asc,
            player_stats.yellow_cards asc,
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

create or replace function public.get_player_statistics_detail(
  target_team_id uuid,
  target_player_id uuid,
  target_season_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  snapshot jsonb;
  player_snapshot jsonb;
begin
  if not exists (
    select 1
    from public.teams
    where teams.id = target_team_id
      and teams.owner_id = (select auth.uid())
  ) then
    raise exception 'statistics_forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.players
    where players.id = target_player_id
      and players.team_id = target_team_id
  ) then
    raise exception 'statistics_player_not_found' using errcode = '42501';
  end if;

  snapshot := public.get_statistics_snapshot(target_team_id, target_season_id);
  select value
  into player_snapshot
  from jsonb_array_elements(snapshot->'players') as rows(value)
  where rows.value->>'player_id' = target_player_id::text;

  with completed_matches as materialized (
    select
      matches.id,
      matches.season_id,
      matches.opponent_name,
      matches.kickoff_at,
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
  player_match_events as (
    select
      match_events.match_id,
      count(*) filter (where match_events.type = 'goal')::integer as goals,
      count(*) filter (where match_events.type = 'yellow_card')::integer as yellow_cards,
      count(*) filter (where match_events.type = 'red_card')::integer as red_cards
    from public.match_events
    join completed_matches
      on completed_matches.id = match_events.match_id
    where match_events.team_id = target_team_id
      and match_events.player_id = target_player_id
    group by match_events.match_id
  ),
  recent_matches as (
    select
      completed_matches.id as match_id,
      completed_matches.season_id,
      completed_matches.opponent_name,
      completed_matches.kickoff_at,
      completed_matches.team_score,
      completed_matches.opponent_score,
      case
        when completed_matches.team_score > completed_matches.opponent_score then 'win'
        when completed_matches.team_score = completed_matches.opponent_score then 'draw'
        else 'loss'
      end as result,
      coalesce(player_match_events.goals, 0) as goals,
      coalesce(player_match_events.yellow_cards, 0) as yellow_cards,
      coalesce(player_match_events.red_cards, 0) as red_cards
    from completed_matches
    join public.callups
      on callups.team_id = target_team_id
      and callups.match_id = completed_matches.id
      and callups.player_id = target_player_id
    left join player_match_events
      on player_match_events.match_id = completed_matches.id
    order by completed_matches.kickoff_at desc, completed_matches.id desc
    limit 10
  ),
  goal_history as (
    select
      match_events.id as event_id,
      completed_matches.id as match_id,
      completed_matches.opponent_name,
      completed_matches.kickoff_at,
      match_events.minute,
      coalesce(match_events.stoppage_time, 0) as stoppage_time,
      completed_matches.team_score,
      completed_matches.opponent_score,
      case
        when completed_matches.team_score > completed_matches.opponent_score then 'win'
        when completed_matches.team_score = completed_matches.opponent_score then 'draw'
        else 'loss'
      end as result
    from public.match_events
    join completed_matches
      on completed_matches.id = match_events.match_id
    where match_events.team_id = target_team_id
      and match_events.player_id = target_player_id
      and match_events.type = 'goal'
    order by completed_matches.kickoff_at desc, match_events.minute desc, match_events.id desc
    limit 50
  ),
  discipline_history as (
    select
      match_events.id as event_id,
      completed_matches.id as match_id,
      completed_matches.opponent_name,
      completed_matches.kickoff_at,
      match_events.minute,
      coalesce(match_events.stoppage_time, 0) as stoppage_time,
      completed_matches.team_score,
      completed_matches.opponent_score,
      match_events.type,
      case
        when completed_matches.team_score > completed_matches.opponent_score then 'win'
        when completed_matches.team_score = completed_matches.opponent_score then 'draw'
        else 'loss'
      end as result
    from public.match_events
    join completed_matches
      on completed_matches.id = match_events.match_id
    where match_events.team_id = target_team_id
      and match_events.player_id = target_player_id
      and match_events.type in ('yellow_card', 'red_card')
    order by completed_matches.kickoff_at desc, match_events.minute desc, match_events.id desc
    limit 50
  )
  select jsonb_build_object(
    'has_completed_matches', (snapshot->>'has_completed_matches')::boolean,
    'player', player_snapshot,
    'recent_matches', coalesce((
      select jsonb_agg(to_jsonb(recent_matches) order by recent_matches.kickoff_at desc, recent_matches.match_id desc)
      from recent_matches
    ), '[]'::jsonb),
    'goal_history', coalesce((
      select jsonb_agg(to_jsonb(goal_history) order by goal_history.kickoff_at desc, goal_history.minute desc, goal_history.event_id desc)
      from goal_history
    ), '[]'::jsonb),
    'discipline_history', coalesce((
      select jsonb_agg(to_jsonb(discipline_history) order by discipline_history.kickoff_at desc, discipline_history.minute desc, discipline_history.event_id desc)
      from discipline_history
    ), '[]'::jsonb)
  )
  into snapshot;

  return snapshot;
end;
$$;

revoke all on function public.get_statistics_snapshot(uuid, uuid)
from public, anon;
grant execute on function public.get_statistics_snapshot(uuid, uuid)
to authenticated;

revoke all on function public.get_player_statistics_detail(uuid, uuid, uuid)
from public, anon;
grant execute on function public.get_player_statistics_detail(uuid, uuid, uuid)
to authenticated;
