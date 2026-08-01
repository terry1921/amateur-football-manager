"use client";

import {
  Award,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getLeaderboardPlayers,
  getLeaderboardRank,
  getPlayerAwards,
  type LeaderboardId,
  type LeaderboardMetric,
} from "./model";
import {
  getPlayerDisplayNameFromStatistics,
  type PlayerStatistics,
  type PlayerStatisticsFilters,
  type StatisticsSeason,
  type StatisticsSnapshot,
} from "@/features/statistics/model";

export type LeaderboardsViewData = {
  team: { name: string };
  seasons: StatisticsSeason[];
  activeSeason: StatisticsSeason | null;
  selectedFilter: string;
  selectedSeason: StatisticsSeason | null;
  snapshot: StatisticsSnapshot;
  players: PlayerStatistics[];
  filters: PlayerStatisticsFilters;
};

function FilterBar({ data }: { data: LeaderboardsViewData }) {
  const t = useTranslations("Leaderboards");
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
        {options.map((option) => (
          <Link
            key={option.key}
            href={`/leaderboards?${querySuffix(option.key)}`}
            aria-current={
              option.key === data.selectedFilter ? "page" : undefined
            }
            className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch ${
              option.key === data.selectedFilter
                ? "bg-pitch text-white"
                : "border border-line text-muted hover:border-pitch hover:text-pitch"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </nav>
      <form
        method="get"
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-end"
      >
        <input type="hidden" name="season" value={data.selectedFilter} />
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

function AwardCard({
  awardId,
  player,
  icon: Icon,
}: {
  awardId: "goldenBoot" | "bestDiscipline" | "ironPlayer";
  player: PlayerStatistics;
  icon: typeof Trophy;
}) {
  const t = useTranslations("Leaderboards");
  return (
    <Link
      href={`/players/${player.player_id}`}
      className="group rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.035)] transition hover:-translate-y-0.5 hover:border-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.1em] text-pitch">
            {t(`awards.${awardId}.eyebrow`)}
          </p>
          <h2 className="mt-2 text-lg font-black text-ink">
            {t(`awards.${awardId}.title`)}
          </h2>
        </div>
        <Icon aria-hidden="true" className="size-6 text-pitch" />
      </div>
      <p className="mt-5 text-xl font-black tracking-[-0.03em] text-ink group-hover:text-pitch">
        {getPlayerDisplayNameFromStatistics(player)}
      </p>
      <p className="mt-1 text-sm text-muted">
        {t(`awards.${awardId}.value`, {
          goals: player.goals,
          matches: player.matches_called_up,
        })}
      </p>
    </Link>
  );
}

function Awards({ players }: { players: PlayerStatistics[] }) {
  const t = useTranslations("Leaderboards");
  const awards = getPlayerAwards(players);
  if (awards.length === 0) return null;
  const icons = {
    goldenBoot: Trophy,
    bestDiscipline: ShieldCheck,
    ironPlayer: Award,
  } as const;
  return (
    <section aria-labelledby="leaderboard-awards">
      <div className="mb-3 flex items-center gap-3">
        <Award aria-hidden="true" className="size-5 text-pitch" />
        <h2
          id="leaderboard-awards"
          className="text-xl font-black tracking-[-0.03em] text-ink"
        >
          {t("awards.title")}
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {awards.map((award) => (
          <AwardCard
            key={award.id}
            awardId={award.id}
            player={award.player}
            icon={icons[award.id]}
          />
        ))}
      </div>
    </section>
  );
}

function Record({ player }: { player: PlayerStatistics }) {
  return (
    <span className="whitespace-nowrap text-xs font-bold text-muted">
      {player.matches_won}-{player.matches_drawn}-{player.matches_lost}
    </span>
  );
}

function LeaderboardTable({
  id,
  players,
  metric,
}: {
  id: LeaderboardId;
  players: PlayerStatistics[];
  metric: LeaderboardMetric;
}) {
  const t = useTranslations("Leaderboards");
  const rows = getLeaderboardPlayers(players, id);
  const title = t(`tables.${id}.title`);
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.035)]">
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          {id === "topScorers" ? (
            <Trophy aria-hidden="true" className="size-5 text-pitch" />
          ) : id === "calledUp" ? (
            <UsersRound aria-hidden="true" className="size-5 text-pitch" />
          ) : (
            <ShieldAlert aria-hidden="true" className="size-5 text-pitch" />
          )}
          <h2 className="text-lg font-black tracking-[-0.025em] text-ink">
            {title}
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          {t(`tables.${id}.description`)}
        </p>
      </header>
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[37rem] text-left">
            <caption className="sr-only">{title}</caption>
            <thead className="bg-[#f8faf9] text-xs font-black uppercase tracking-[0.08em] text-muted">
              <tr>
                <th scope="col" className="w-16 px-5 py-3 sm:px-6">
                  {t("table.rank")}
                </th>
                <th scope="col" className="px-5 py-3 sm:px-6">
                  {t("table.player")}
                </th>
                <th scope="col" className="px-5 py-3 text-right sm:px-6">
                  {t(`table.${metric}`)}
                </th>
                <th scope="col" className="px-5 py-3 text-right sm:px-6">
                  {t("table.calledUp")}
                </th>
                <th scope="col" className="px-5 py-3 text-right sm:px-6">
                  {t("table.record")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((player, index) => {
                const rank = getLeaderboardRank(rows, index, metric);
                const name = getPlayerDisplayNameFromStatistics(player);
                return (
                  <tr key={player.player_id} className="border-t border-line">
                    <td className="px-5 py-4 text-sm font-black text-muted sm:px-6">
                      <span aria-label={t("table.rankLabel", { rank, name })}>
                        {rank}
                      </span>
                    </td>
                    <th scope="row" className="px-5 py-4 sm:px-6">
                      <Link
                        href={`/players/${player.player_id}`}
                        className="font-black text-ink underline-offset-4 hover:text-pitch hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
                      >
                        {name}
                      </Link>
                    </th>
                    <td className="px-5 py-4 text-right text-sm font-black text-ink sm:px-6">
                      {player[metric]}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-muted sm:px-6">
                      {player.matches_called_up}
                    </td>
                    <td className="px-5 py-4 text-right sm:px-6">
                      <Record player={player} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-5 text-sm text-muted sm:p-6">{t(`empty.${id}`)}</p>
      )}
    </section>
  );
}

export function LeaderboardsView({ data }: { data: LeaderboardsViewData }) {
  const t = useTranslations("Leaderboards");
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
          <Trophy aria-hidden="true" className="mx-auto size-8 text-pitch" />
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
          <Awards players={data.players} />
          <div className="space-y-5">
            <LeaderboardTable
              id="topScorers"
              players={data.players}
              metric="goals"
            />
            <div className="grid gap-5 lg:grid-cols-2">
              <LeaderboardTable
                id="yellowCards"
                players={data.players}
                metric="yellow_cards"
              />
              <LeaderboardTable
                id="redCards"
                players={data.players}
                metric="red_cards"
              />
            </div>
            <LeaderboardTable
              id="calledUp"
              players={data.players}
              metric="matches_called_up"
            />
          </div>
        </>
      )}
    </div>
  );
}
