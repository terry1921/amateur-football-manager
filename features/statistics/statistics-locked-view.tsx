"use client";

import { PremiumPreview } from "@/features/billing/premium-preview";
import { useTranslations } from "next-intl";

export function StatisticsLockedView({
  teamId,
  checkoutAvailable,
}: {
  teamId: string;
  checkoutAvailable: boolean;
}) {
  const t = useTranslations("Statistics");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-pitch">
          {t("locked.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-muted">
          {t("description")}
        </p>
      </header>

      <PremiumPreview
        title={t("locked.title")}
        description={t("locked.description")}
        teamId={teamId}
        checkoutAvailable={checkoutAvailable}
      />
    </div>
  );
}
