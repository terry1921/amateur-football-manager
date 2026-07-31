"use client";

import { BarChart3, ShieldAlert, Target, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PlayerStatistics } from "./model";

export function PlayerStatisticsCard({
  player,
  hasCompletedMatches,
}: {
  player: PlayerStatistics | null;
  hasCompletedMatches: boolean;
}) {
  const t = useTranslations("Statistics");
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.04)]">
      <header className="border-b border-line px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <BarChart3 aria-hidden="true" className="size-5 text-pitch" />
          <h2 className="text-xl font-black tracking-[-0.03em] text-ink">
            {t("playerTitle")}
          </h2>
        </div>
      </header>
      {!hasCompletedMatches || !player ? (
        <p className="bg-[#f8faf9] px-5 py-4 text-sm leading-6 text-muted sm:px-8">
          {t("empty.description")}
        </p>
      ) : (
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-muted">
              <Target aria-hidden="true" className="size-4 text-pitch" />
              {t("playerMetrics.goals")}
            </p>
            <p className="mt-2 text-2xl font-black text-ink">{player.goals}</p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-muted">
              <Trophy aria-hidden="true" className="size-4 text-pitch" />
              {t("playerMetrics.record")}
            </p>
            <p className="mt-2 text-2xl font-black text-ink">
              {player.matches_won}-{player.matches_drawn}-{player.matches_lost}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-muted">
              <BarChart3 aria-hidden="true" className="size-4 text-pitch" />
              {t("playerMetrics.calledUp")}
            </p>
            <p className="mt-2 text-2xl font-black text-ink">
              {player.matches_called_up}
            </p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-muted">
              <ShieldAlert aria-hidden="true" className="size-4 text-pitch" />
              {t("playerMetrics.cards")}
            </p>
            <p className="mt-2 text-2xl font-black text-ink">
              {player.yellow_cards}Y · {player.red_cards}R
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
