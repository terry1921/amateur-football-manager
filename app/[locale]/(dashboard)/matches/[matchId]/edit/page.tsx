import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { updateMatchAction } from "@/features/matches/actions";
import { getMatchFormData } from "@/features/matches/data";
import { MatchForm } from "@/features/matches/match-form";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export default async function EditMatchPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; matchId: string }>;
}) {
  const { locale, matchId } = await params;
  const [data, t] = await Promise.all([
    getMatchFormData(matchId),
    getTranslations({ locale, namespace: "Matches.edit" }),
  ]);
  if (!data.match) notFound();

  if (data.match.status !== "scheduled") {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-6 sm:p-8">
        <h1 className="text-3xl font-black tracking-[-0.035em] text-ink">
          {t("protectedTitle")}
        </h1>
        <p className="mt-3 leading-7 text-muted">{t("protectedDescription")}</p>
        <Link
          href={`/matches/${data.match.id}`}
          className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-pitch px-4 text-sm font-bold text-pitch"
        >
          {t("protectedTitle")}
        </Link>
      </section>
    );
  }

  if (data.seasons.length === 0) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-6 sm:p-8">
        <h1 className="text-3xl font-black tracking-[-0.035em] text-ink">
          {t("protectedTitle")}
        </h1>
        <p className="mt-3 leading-7 text-muted">{t("protectedDescription")}</p>
      </section>
    );
  }

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
          action={updateMatchAction.bind(null, locale, data.match.id)}
          seasons={data.seasons}
          defaultSeasonId={data.defaultSeasonId}
          defaultValues={{
            seasonId: data.match.season_id,
            opponentName: data.match.opponent_name,
            kickoffAt: data.match.kickoff_at,
            location: data.match.home_away,
            venue: data.match.venue ?? "",
            notes: data.match.notes ?? "",
          }}
        />
      </section>
    </div>
  );
}
