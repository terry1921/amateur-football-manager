import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { updateSeasonAction } from "@/features/seasons/actions";
import { getSeasonDetails } from "@/features/seasons/data";
import { SeasonForm } from "@/features/seasons/season-form";
import type { AppLocale } from "@/i18n/routing";

export default async function EditSeasonPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; seasonId: string }>;
}) {
  const { locale, seasonId } = await params;
  const [season, t] = await Promise.all([
    getSeasonDetails(seasonId),
    getTranslations({ locale, namespace: "Seasons.edit" }),
  ]);

  if (!season) notFound();
  if (!season.editable) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-6 sm:p-8">
        <h1 className="text-3xl font-black tracking-[-0.035em] text-ink">
          {t("protectedTitle")}
        </h1>
        <p className="mt-3 leading-7 text-muted">{t("protectedDescription")}</p>
      </section>
    );
  }

  const updateSeason = updateSeasonAction.bind(null, locale, season.id);
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
        <SeasonForm
          action={updateSeason}
          defaultValues={{
            name: season.name,
            startDate: season.start_date ?? "",
            endDate: season.end_date ?? "",
          }}
        />
      </section>
    </div>
  );
}
