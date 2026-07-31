"use client";

import { BarChart3, Target, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TeamStatistics } from "./model";

export function TeamStatisticsSummary({
  team,
  hasCompletedMatches,
}: {
  team: TeamStatistics;
  hasCompletedMatches: boolean;
}) {
  const t = useTranslations("Statistics");
  if (!hasCompletedMatches) {
    return (
      <p className="border-t border-line bg-[#f8faf9] px-5 py-4 text-sm leading-6 text-muted sm:px-6">
        {t("empty.description")}
      </p>
    );
  }
  return (
    <div className="grid gap-3 border-t border-line p-5 sm:grid-cols-3 sm:p-6">
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-muted">
          <BarChart3 aria-hidden="true" className="size-4 text-pitch" />
          {t("metrics.matchesPlayed")}
        </p>
        <p className="mt-2 text-2xl font-black text-ink">
          {team.matches_played}
        </p>
      </div>
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-muted">
          <Trophy aria-hidden="true" className="size-4 text-pitch" />
          {t("metrics.record")}
        </p>
        <p className="mt-2 text-2xl font-black text-ink">
          {team.wins}-{team.draws}-{team.losses}
        </p>
      </div>
      <div>
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-muted">
          <Target aria-hidden="true" className="size-4 text-pitch" />
          {t("metrics.goalsScored")}
        </p>
        <p className="mt-2 text-2xl font-black text-ink">{team.goals_scored}</p>
      </div>
    </div>
  );
}
