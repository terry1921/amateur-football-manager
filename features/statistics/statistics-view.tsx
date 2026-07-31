"use client";

import {
  BarChart3,
  Search,
  ShieldAlert,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getCompetitionRank,
  getPlayerDisplayNameFromStatistics,
  getRedCardLeaders,
  getTopScorers,
  getYellowCardLeaders,
  type PlayerStatistics,
  type PlayerStatisticsFilters,
  type StatisticsSeason,
  type StatisticsSnapshot,
  type TeamStatistics,
} from "./model";

export type StatisticsViewData = {
  team: { name: string };
  seasons: StatisticsSeason[];
  activeSeason: StatisticsSeason | null;
  selectedFilter: string;
  selectedSeason: StatisticsSeason | null;
  snapshot: StatisticsSnapshot;
  players: PlayerStatistics[];
  filters: PlayerStatisticsFilters;
};

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-xl border border-line bg-[#f8faf9] p-4">
      <div className="flex items-center justify-between gap-3 text-muted">
        <span className="text-xs font-black uppercase tracking-[0.08em]">
          {label}
        </span>
        <Icon aria-hidden="true" className="size-4 text-pitch" />
      </div>
      <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink">
        {value}
      </p>
    </div>
  );
}

function TeamSummary({ team }: { team: TeamStatistics }) {
  const t = useTranslations("Statistics");
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label={t("metrics.matchesPlayed")}
        value={team.matches_played}
        icon={BarChart3}
      />
      <MetricCard label={t("metrics.record")} value={team.wins} icon={Trophy} />
      <MetricCard
        label={t("metrics.goalsScored")}
        value={team.goals_scored}
        icon={Target}
      />
      <MetricCard
        label={t("metrics.goalDifference")}
        value={team.goal_difference}
        icon={ShieldAlert}
      />
    </div>
  );
}

function RecordLine({ team }: { team: TeamStatistics }) {
  const t = useTranslations("Statistics");
  return (
    <p className="mt-4 text-sm font-bold text-muted">
      {t("recordLine", {
        wins: team.wins,
        draws: team.draws,
        losses: team.losses,
        goalsConceded: team.goals_conceded,
        yellowCards: team.yellow_cards,
        redCards: team.red_cards,
      })}
    </p>
  );
}

function PlayerRow({ player }: { player: PlayerStatistics }) {
  const t = useTranslations("Statistics");
  return (
    <li className="flex items-center gap-3 border-t border-line px-5 py-4 first:border-t-0 sm:px-6">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pitch/8 text-xs font-black text-pitch">
        {player.shirt_number ?? "—"}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/players/${player.player_id}`}
          className="font-black text-ink underline-offset-4 hover:text-pitch hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          {getPlayerDisplayNameFromStatistics(player)}
        </Link>
        <p className="mt-1 text-xs text-muted">
          {t("playerLine", {
            matches: player.matches_called_up,
            wins: player.matches_won,
            draws: player.matches_drawn,
            losses: player.matches_lost,
          })}
        </p>
        <p className="mt-1 text-xs text-muted">
          {t(`status.${player.status}`)} · {t(`position.${player.position}`)}
        </p>
      </div>
      <div className="text-right text-sm font-black text-ink">
        <p>
          {player.goals} {t("table.goalsShort")}
        </p>
        <p className="mt-1 text-xs font-bold text-muted">
          {player.yellow_cards}Y · {player.red_cards}R
        </p>
      </div>
    </li>
  );
}

function RankingCard({
  title,
  description,
  players,
  empty,
  icon: Icon,
  metric,
}: {
  title: string;
  description: string;
  players: PlayerStatistics[];
  empty: string;
  icon: typeof Trophy;
  metric: "goals" | "yellow_cards" | "red_cards";
}) {
  const t = useTranslations("Statistics");
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.035)]">
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Icon aria-hidden="true" className="size-5 text-pitch" />
          <h2 className="text-lg font-black tracking-[-0.025em] text-ink">
            {title}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </header>
      {players.length > 0 ? (
        <ol aria-label={title}>
          {players.slice(0, 5).map((player, index) => (
            <li
              key={player.player_id}
              className="flex items-center gap-3 border-t border-line px-5 py-4 first:border-t-0 sm:px-6"
            >
              <span className="w-5 shrink-0 text-center text-sm font-black text-muted">
                {getCompetitionRank(players, index, metric)}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/players/${player.player_id}`}
                  className="font-black text-ink hover:text-pitch"
                >
                  {getPlayerDisplayNameFromStatistics(player)}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  {t("rankingCalledUp", {
                    count: player.matches_called_up,
                  })}
                </p>
              </div>
              <span className="text-right text-sm font-black text-ink">
                {player[metric]}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="p-5 text-sm text-muted sm:p-6">{empty}</p>
      )}
    </section>
  );
}

function FilterBar({ data }: { data: StatisticsViewData }) {
  const t = useTranslations("Statistics");
  const seasonKey = data.selectedFilter;
  const querySuffix = (season: string) => {
    const params = new URLSearchParams({ season });
    if (data.filters.search) params.set("q", data.filters.search);
    if (data.filters.position !== "all")
      params.set("position", data.filters.position);
    if (data.filters.status !== "all")
      params.set("status", data.filters.status);
    return params.toString();
  };
  const options = [
    { key: "current", label: t("filters.current") },
    { key: "all", label: t("filters.all") },
    ...data.seasons
      .filter(({ id }) => id !== data.activeSeason?.id)
      .map((season) => ({ key: season.id, label: season.name })),
  ];

  return (
    <div className="space-y-4">
      <nav aria-label={t("filters.label")} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.key === seasonKey;
          return (
            <Link
              key={option.key}
              href={`/statistics?${querySuffix(option.key)}`}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch ${
                selected
                  ? "bg-pitch text-white"
                  : "border border-line text-muted hover:border-pitch hover:text-pitch"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>
      <form
        method="get"
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end"
      >
        <input type="hidden" name="season" value={seasonKey} />
        <label className="block text-sm font-bold text-ink">
          {t("filters.search")}
          <span className="relative mt-1 block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <input
              name="q"
              defaultValue={data.filters.search}
              className="min-h-11 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm font-medium text-ink outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/15"
            />
          </span>
        </label>
        <label className="block text-sm font-bold text-ink">
          {t("filters.position")}
          <select
            name="position"
            defaultValue={data.filters.position}
            className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/15"
          >
            <option value="all">{t("filters.allPositions")}</option>
            {(["GK", "DEF", "MID", "FWD"] as const).map((position) => (
              <option key={position} value={position}>
                {t(`position.${position}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold text-ink">
          {t("filters.status")}
          <select
            name="status"
            defaultValue={data.filters.status}
            className="mt-1 min-h-11 w-full rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/15"
          >
            <option value="all">{t("filters.allStatuses")}</option>
            <option value="current">{t("filters.currentPlayers")}</option>
            {(["active", "injured", "suspended", "inactive"] as const).map(
              (status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ),
            )}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-pitch px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          {t("filters.apply")}
        </button>
      </form>
    </div>
  );
}

function PlayerTable({ players }: { players: PlayerStatistics[] }) {
  const t = useTranslations("Statistics");
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.035)]">
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <UsersRound aria-hidden="true" className="size-5 text-pitch" />
          <h2 className="text-lg font-black tracking-[-0.025em] text-ink">
            {t("tables.players.title")}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          {t("tables.players.description")}
        </p>
      </header>
      {players.length > 0 ? (
        <ul>
          {players.map((player) => (
            <PlayerRow key={player.player_id} player={player} />
          ))}
        </ul>
      ) : (
        <p className="p-5 text-sm text-muted sm:p-6">{t("empty.filtered")}</p>
      )}
    </section>
  );
}

export function StatisticsView({ data }: { data: StatisticsViewData }) {
  const t = useTranslations("Statistics");
  const topScorers = getTopScorers(data.players);
  const yellowCardLeaders = getYellowCardLeaders(data.players);
  const redCardLeaders = getRedCardLeaders(data.players);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-pitch">
          {data.team.name}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
          {t("description")}
        </p>
        <div className="mt-5 border-t border-line pt-4">
          <FilterBar data={data} />
          <p className="mt-3 text-sm font-bold text-muted">
            {data.selectedSeason?.name ?? t("filters.career")}
          </p>
        </div>
      </header>

      {!data.snapshot.has_completed_matches ? (
        <section className="rounded-2xl border border-dashed border-line bg-white p-7 text-center sm:p-10">
          <BarChart3 aria-hidden="true" className="mx-auto size-8 text-pitch" />
          <h2 className="mt-4 text-xl font-black text-ink">
            {t("empty.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
            {t("empty.description")}
          </p>
        </section>
      ) : data.players.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-line bg-white p-7 text-center sm:p-10">
          <UsersRound
            aria-hidden="true"
            className="mx-auto size-8 text-pitch"
          />
          <h2 className="mt-4 text-xl font-black text-ink">
            {t("empty.filteredTitle")}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">
            {t("empty.filtered")}
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-6">
            <h2 className="text-xl font-black tracking-[-0.03em] text-ink">
              {t("teamTitle")}
            </h2>
            <TeamSummary team={data.snapshot.team} />
            <RecordLine team={data.snapshot.team} />
          </section>
          <div className="grid gap-5 lg:grid-cols-3">
            <RankingCard
              title={t("tables.topScorers.title")}
              description={t("tables.topScorers.description")}
              players={topScorers}
              empty={t("empty.topScorers")}
              icon={Trophy}
              metric="goals"
            />
            <RankingCard
              title={t("tables.yellowCards.title")}
              description={t("tables.yellowCards.description")}
              players={yellowCardLeaders}
              empty={t("empty.yellowCards")}
              icon={ShieldAlert}
              metric="yellow_cards"
            />
            <RankingCard
              title={t("tables.redCards.title")}
              description={t("tables.redCards.description")}
              players={redCardLeaders}
              empty={t("empty.redCards")}
              icon={ShieldAlert}
              metric="red_cards"
            />
          </div>
          <PlayerTable players={data.players} />
        </>
      )}
    </div>
  );
}
