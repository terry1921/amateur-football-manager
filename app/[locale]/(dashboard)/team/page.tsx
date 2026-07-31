import { ArrowRight, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getStatisticsData } from "@/features/statistics/data";
import { TeamStatisticsSummary } from "@/features/statistics/team-statistics-summary";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const [t, data] = await Promise.all([
    getTranslations({ locale, namespace: "Statistics" }),
    getStatisticsData("current"),
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.04)]">
        <header className="flex items-center gap-4 p-5 sm:p-8">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-pitch/8 text-pitch">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-pitch">
              {t("teamLabel")}
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-ink">
              {data.team.name}
            </h1>
          </div>
        </header>
        <TeamStatisticsSummary
          team={data.snapshot.team}
          hasCompletedMatches={data.snapshot.has_completed_matches}
        />
      </section>
      <Link
        href="/statistics"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        {t("viewAll")}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}
