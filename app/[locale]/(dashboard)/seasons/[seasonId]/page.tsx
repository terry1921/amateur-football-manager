import { ArrowLeft, CalendarDays, Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getSeasonDetails } from "@/features/seasons/data";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function SeasonDetailsPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; seasonId: string }>;
}) {
  const { locale, seasonId } = await params;
  const [season, t] = await Promise.all([
    getSeasonDetails(seasonId),
    getTranslations({ locale, namespace: "Seasons.details" }),
  ]);
  if (!season) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/seasons"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t("back")}
      </Link>
      <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_52px_rgba(7,26,54,0.05)]">
        <header className="flex flex-col gap-5 border-b border-line p-5 sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div className="flex gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-pitch/8 text-pitch">
              <CalendarDays aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-pitch">
                {t(`status.${season.status}`)}
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-ink sm:text-4xl">
                {season.name}
              </h1>
            </div>
          </div>
          {season.editable ? (
            <Link
              href={`/seasons/${season.id}/edit`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-pitch px-4 text-sm font-bold text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
            >
              <Pencil aria-hidden="true" className="size-4" />
              {t("edit")}
            </Link>
          ) : null}
        </header>
        <dl className="grid gap-0 sm:grid-cols-3">
          <div className="border-b border-line p-5 sm:border-r sm:border-b-0 sm:p-6">
            <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted">
              {t("startDate")}
            </dt>
            <dd className="mt-2 font-bold text-ink">
              {formatDate(season.start_date, locale)}
            </dd>
          </div>
          <div className="border-b border-line p-5 sm:border-r sm:border-b-0 sm:p-6">
            <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted">
              {t("endDate")}
            </dt>
            <dd className="mt-2 font-bold text-ink">
              {formatDate(season.end_date, locale)}
            </dd>
          </div>
          <div className="p-5 sm:p-6">
            <dt className="text-xs font-black uppercase tracking-[0.08em] text-muted">
              {t("matches")}
            </dt>
            <dd className="mt-2 font-bold text-ink">{season.matchCount}</dd>
          </div>
        </dl>
        {!season.editable ? (
          <p className="border-t border-line bg-[#f8faf9] px-5 py-4 text-sm leading-6 text-muted sm:px-8">
            {t("protected")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
