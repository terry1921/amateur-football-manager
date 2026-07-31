import { CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createMatchAction } from "@/features/matches/actions";
import { getMatchFormData } from "@/features/matches/data";
import { MatchForm } from "@/features/matches/match-form";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewMatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, query, data] = await Promise.all([
    params,
    searchParams,
    getMatchFormData(),
  ]);
  const t = await getTranslations({ locale, namespace: "Matches.new" });

  if (data.seasons.length === 0) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-line bg-white px-5 py-12 text-center shadow-[0_18px_52px_rgba(7,26,54,0.05)] sm:px-8">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-pitch/8 text-pitch">
          <CalendarDays aria-hidden="true" className="size-7" />
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-ink">
          {t("noSeasonTitle")}
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-7 text-muted">
          {t("noSeasonDescription")}
        </p>
        <Link
          href="/seasons/new"
          className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-pitch px-5 text-sm font-bold text-white"
        >
          {t("noSeasonAction")}
        </Link>
      </section>
    );
  }

  const requestedSeason = first(query.season);
  const defaultSeasonId =
    requestedSeason && data.seasons.some(({ id }) => id === requestedSeason)
      ? requestedSeason
      : data.defaultSeasonId;

  return (
    <div className="mx-auto max-w-2xl">
      <header>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-pitch">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-ink sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          {t("description")}
        </p>
      </header>
      <section className="mt-7 rounded-2xl border border-line bg-white p-5 shadow-[0_18px_52px_rgba(7,26,54,0.05)] sm:p-8">
        <MatchForm
          action={createMatchAction.bind(null, locale)}
          seasons={data.seasons}
          defaultSeasonId={defaultSeasonId}
        />
      </section>
    </div>
  );
}
