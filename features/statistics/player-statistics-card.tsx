"use client";

import {
  BarChart3,
  CalendarDays,
  ShieldAlert,
  Target,
  Trophy,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { MatchDateTime } from "@/features/matches/match-date-time";
import { formatFootballMinute } from "@/features/timeline/model";
import { Link } from "@/i18n/navigation";
import type { PlayerStatisticsDetail, StatisticsSeason } from "./model";

function ScopeSelector({
  playerId,
  seasons,
  selectedFilter,
  activeSeason,
}: {
  playerId: string;
  seasons: StatisticsSeason[];
  selectedFilter: string;
  activeSeason: StatisticsSeason | null;
}) {
  const t = useTranslations("Statistics");
  const options = [
    { key: "current", label: t("filters.current") },
    { key: "all", label: t("filters.all") },
    ...seasons
      .filter(({ id }) => id !== activeSeason?.id)
      .map((season) => ({ key: season.id, label: season.name })),
  ];
  return (
    <nav
      aria-label={t("filters.label")}
      className="mobile-chip-row flex flex-wrap gap-2"
    >
      {options.map((option) => (
        <Link
          key={option.key}
          href={`/players/${playerId}?season=${option.key}`}
          aria-current={option.key === selectedFilter ? "page" : undefined}
          className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch ${
            option.key === selectedFilter
              ? "bg-pitch text-white"
              : "border border-line text-muted hover:border-pitch hover:text-pitch"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-xl border border-line bg-[#f8faf9] p-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-muted">
        <Icon aria-hidden="true" className="size-4 text-pitch" />
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-ink">
        {value}
      </p>
    </div>
  );
}

function ResultLabel({ result }: { result: "win" | "draw" | "loss" }) {
  const t = useTranslations("Statistics");
  return <span className="font-bold text-pitch">{t(`result.${result}`)}</span>;
}

function RecentActivity({ detail }: { detail: PlayerStatisticsDetail }) {
  const t = useTranslations("Statistics");
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.035)]">
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <CalendarDays aria-hidden="true" className="size-5 text-pitch" />
          <h3 className="text-lg font-black tracking-[-0.025em] text-ink">
            {t("history.recentTitle")}
          </h3>
        </div>
        <p className="mt-1 text-sm text-muted">
          {t("history.recentDescription")}
        </p>
      </header>
      {detail.recent_matches.length > 0 ? (
        <ul>
          {detail.recent_matches.map((match) => (
            <li
              key={match.match_id}
              className="flex items-center gap-3 border-t border-line px-5 py-4 first:border-t-0 sm:px-6"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/matches/${match.match_id}`}
                  className="font-black text-ink hover:text-pitch hover:underline"
                >
                  {match.opponent_name}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  <MatchDateTime value={match.kickoff_at} dateOnly /> ·{" "}
                  <ResultLabel result={match.result} />
                </p>
              </div>
              <div className="text-right text-sm font-black text-ink">
                {match.team_score}–{match.opponent_score}
                <p className="mt-1 text-xs font-bold text-muted">
                  {match.goals}G · {match.yellow_cards}Y · {match.red_cards}R
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-5 text-sm text-muted sm:p-6">{t("history.noRecent")}</p>
      )}
    </section>
  );
}

function GoalHistory({ detail }: { detail: PlayerStatisticsDetail }) {
  const t = useTranslations("Statistics");
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.035)]">
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Target aria-hidden="true" className="size-5 text-pitch" />
          <h3 className="text-lg font-black tracking-[-0.025em] text-ink">
            {t("history.goalsTitle")}
          </h3>
        </div>
      </header>
      {detail.goal_history.length > 0 ? (
        <ul>
          {detail.goal_history.map((event) => (
            <li
              key={event.event_id}
              className="flex items-center gap-3 border-t border-line px-5 py-4 first:border-t-0 sm:px-6"
            >
              <span className="text-sm font-black text-pitch">
                {formatFootballMinute(event.minute, event.stoppage_time)}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/matches/${event.match_id}`}
                  className="font-black text-ink hover:text-pitch hover:underline"
                >
                  {event.opponent_name}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  <MatchDateTime value={event.kickoff_at} dateOnly /> ·{" "}
                  <ResultLabel result={event.result} />
                </p>
              </div>
              <span
                className="text-sm font-black text-ink"
                aria-label={t("history.goalLabel")}
              >
                ⚽
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-5 text-sm text-muted sm:p-6">{t("empty.topScorers")}</p>
      )}
    </section>
  );
}

function DisciplineHistory({ detail }: { detail: PlayerStatisticsDetail }) {
  const t = useTranslations("Statistics");
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.035)]">
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <ShieldAlert aria-hidden="true" className="size-5 text-pitch" />
          <h3 className="text-lg font-black tracking-[-0.025em] text-ink">
            {t("history.disciplineTitle")}
          </h3>
        </div>
      </header>
      {detail.discipline_history.length > 0 ? (
        <ul>
          {detail.discipline_history.map((event) => (
            <li
              key={event.event_id}
              className="flex items-center gap-3 border-t border-line px-5 py-4 first:border-t-0 sm:px-6"
            >
              <span
                className="text-sm font-black text-ink"
                aria-label={t(`history.${event.type}`)}
              >
                {event.type === "yellow_card" ? "🟨" : "🟥"}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/matches/${event.match_id}`}
                  className="font-black text-ink hover:text-pitch hover:underline"
                >
                  {event.opponent_name}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  {t(`history.${event.type}`)} ·{" "}
                  {formatFootballMinute(event.minute, event.stoppage_time)} ·{" "}
                  <MatchDateTime value={event.kickoff_at} dateOnly />
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-5 text-sm text-muted sm:p-6">{t("empty.discipline")}</p>
      )}
    </section>
  );
}

export function PlayerStatisticsCard({
  detail,
  seasons,
  activeSeason,
  selectedFilter,
  selectedSeason,
}: {
  detail: PlayerStatisticsDetail;
  seasons: StatisticsSeason[];
  activeSeason: StatisticsSeason | null;
  selectedFilter: string;
  selectedSeason: StatisticsSeason | null;
}) {
  const t = useTranslations("Statistics");
  const player = detail.player;
  if (!player) return null;

  return (
    <section className="mt-6 space-y-5">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.04)]">
        <header className="border-b border-line px-5 py-4 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <BarChart3 aria-hidden="true" className="size-5 text-pitch" />
                <h2 className="text-xl font-black tracking-[-0.03em] text-ink">
                  {t("playerTitle")}
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted">
                {t(`status.${player.status}`)} ·{" "}
                {t(`position.${player.position}`)}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-black uppercase tracking-[0.08em] text-muted">
                {selectedSeason?.name ?? t("filters.career")}
              </p>
              <ScopeSelector
                playerId={player.player_id}
                seasons={seasons}
                selectedFilter={selectedFilter}
                activeSeason={activeSeason}
              />
            </div>
          </div>
        </header>
        {!detail.has_completed_matches ? (
          <p className="bg-[#f8faf9] px-5 py-5 text-sm leading-6 text-muted sm:px-8">
            {t("empty.playerNoData")}
          </p>
        ) : (
          <>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5 sm:p-8">
              <Metric
                label={t("playerMetrics.goals")}
                value={player.goals}
                icon={Target}
              />
              <Metric
                label={t("playerMetrics.completedCalledUp")}
                value={player.matches_called_up}
                icon={BarChart3}
              />
              <Metric
                label={t("playerMetrics.totalCalledUp")}
                value={player.total_matches_called_up}
                icon={CalendarDays}
              />
              <Metric
                label={t("playerMetrics.scoringMatches")}
                value={player.scoring_matches}
                icon={Trophy}
              />
              <Metric
                label={t("playerMetrics.cards")}
                value={`${player.yellow_cards}Y · ${player.red_cards}R`}
                icon={ShieldAlert}
              />
            </div>
            <div className="border-t border-line bg-[#f8faf9] px-5 py-4 text-sm font-bold text-muted sm:px-8">
              <span className="sr-only">
                {t("playerMetrics.teamRecordLabel")}:{" "}
              </span>
              {t("teamRecordWhenCalledUp", {
                wins: player.matches_won,
                draws: player.matches_drawn,
                losses: player.matches_lost,
              })}
              <span className="ml-3">
                {t("playerMetrics.multiGoalMatches", {
                  count: player.multi_goal_matches,
                })}
              </span>
            </div>
          </>
        )}
      </div>
      {detail.has_completed_matches ? (
        <>
          <RecentActivity detail={detail} />
          <div className="grid gap-5 lg:grid-cols-2">
            <GoalHistory detail={detail} />
            <DisciplineHistory detail={detail} />
          </div>
        </>
      ) : null}
    </section>
  );
}
