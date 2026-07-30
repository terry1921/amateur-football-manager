import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { updatePlayerAction } from "@/features/players/actions";
import { getPlayerDetails } from "@/features/players/data";
import { PlayerForm } from "@/features/players/player-form";
import type { AppLocale } from "@/i18n/routing";

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; playerId: string }>;
}) {
  const { locale, playerId } = await params;
  const [player, t] = await Promise.all([
    getPlayerDetails(playerId),
    getTranslations({ locale, namespace: "Players.edit" }),
  ]);
  if (!player) notFound();
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
        <PlayerForm
          action={updatePlayerAction.bind(null, locale, player.id)}
          defaultValues={{
            firstName: player.first_name,
            lastName: player.last_name ?? "",
            nickname: player.nickname ?? "",
            shirtNumber: player.shirt_number?.toString() ?? "",
            position: player.position,
            status: player.status,
          }}
        />
      </section>
    </div>
  );
}
