"use client";

import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { UpgradeDialog } from "./upgrade-dialog";

/** Reusable, non-entitlement-changing preview for a Pro-only capability. */
export function PremiumPreview({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const t = useTranslations("Billing");
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_14px_44px_rgba(7,26,54,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-[#f6f9f7] px-5 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pitch/10 px-2.5 py-1 text-xs font-black text-pitch">
          {t("plan.pro")}
        </span>
        <LockKeyhole aria-hidden="true" className="size-4 text-muted" />
      </div>
      <div className="p-5 sm:p-6">
        <h2 className="text-lg font-black text-ink">{title}</h2>
        <p className="mt-2 leading-6 text-muted">{description}</p>
        <div className="mt-5 max-w-xs">
          <UpgradeDialog triggerLabel={t("preview.learn")} />
        </div>
      </div>
    </section>
  );
}
