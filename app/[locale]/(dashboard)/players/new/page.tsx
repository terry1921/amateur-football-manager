import { getTranslations } from "next-intl/server";
import { createPlayerAction } from "@/features/players/actions";
import { PlayerForm } from "@/features/players/player-form";
import type { AppLocale } from "@/i18n/routing";

export default async function NewPlayerPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Players.new" });
  return (
    <div className="mx-auto max-w-2xl">
      <header>
        <h1 className="text-4xl font-black tracking-[-0.04em] text-ink sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          {t("description")}
        </p>
      </header>
      <section className="mt-7 rounded-2xl border border-line bg-white p-5 shadow-[0_18px_52px_rgba(7,26,54,0.05)] sm:p-8">
        <PlayerForm action={createPlayerAction.bind(null, locale)} />
      </section>
    </div>
  );
}
