import { ArrowLeft, Pencil, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { changePlayerStatusAction } from "@/features/players/actions";
import { getPlayerDetails } from "@/features/players/data";
import { getPlayerDisplayName } from "@/features/players/model";
import { PlayerLifecycleButton } from "@/features/players/player-lifecycle-button";
import { getStatisticsData } from "@/features/statistics/data";
import { PlayerStatisticsCard } from "@/features/statistics/player-statistics-card";
import { getPlayerStatistics as findPlayerStatistics } from "@/features/statistics/model";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export default async function PlayerDetailsPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; playerId: string }>;
}) {
  const { locale, playerId } = await params;
  const [player, t] = await Promise.all([
    getPlayerDetails(playerId),
    getTranslations({ locale, namespace: "Players" }),
  ]);
  if (!player) notFound();
  const statistics = await getStatisticsData("all");
  const playerStatistics = findPlayerStatistics(statistics.snapshot, player.id);
  const targetStatus = player.status === "inactive" ? "active" : "inactive";
  const lifecycle = changePlayerStatusAction.bind(
    null,
    locale,
    player.id,
    targetStatus,
  );
  const fields = [
    [t("details.shirtNumber"), player.shirt_number?.toString() ?? "—"],
    [t("details.position"), t(`position.${player.position}`)],
    [t("details.status"), t(`status.${player.status}`)],
    [t("details.nickname"), player.nickname || "—"],
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/players"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("details.back")}
      </Link>
      <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_52px_rgba(7,26,54,0.05)]">
        <header className="flex flex-col gap-5 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div className="flex gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-pitch/8 text-pitch">
              <UsersRound aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-pitch">
                {t(`status.${player.status}`)}
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-ink sm:text-4xl">
                {getPlayerDisplayName(player)}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/players/${player.id}/edit`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-pitch px-4 text-sm font-bold text-pitch"
            >
              <Pencil aria-hidden="true" className="size-4" />
              {t("actions.edit")}
            </Link>
            <PlayerLifecycleButton
              action={lifecycle}
              label={t(
                `actions.${targetStatus === "active" ? "reactivate" : "deactivate"}`,
              )}
              lifecycle={
                targetStatus === "active" ? "reactivate" : "deactivate"
              }
            />
          </div>
        </header>
        <dl className="grid sm:grid-cols-2">
          {fields.map(([label, value], index) => (
            <div
              key={label}
              className={`p-5 sm:p-6 ${index < 2 ? "border-b border-line" : ""} ${index % 2 === 0 ? "sm:border-r" : ""}`}
            >
              <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted">
                {label}
              </dt>
              <dd className="mt-2 font-bold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-line bg-[#f8faf9] px-5 py-4 text-sm leading-6 text-muted sm:px-8">
          {t("details.historyProtected")}
        </p>
      </section>
      <PlayerStatisticsCard
        player={playerStatistics}
        hasCompletedMatches={statistics.snapshot.has_completed_matches}
      />
    </div>
  );
}
