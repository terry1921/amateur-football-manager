"use client";

import { Check, LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { UpgradeDialog } from "./upgrade-dialog";

export type CheckoutStatus = "idle" | "success" | "canceled";

export function PricingPage({
  checkoutStatus,
}: {
  checkoutStatus: CheckoutStatus;
}) {
  const t = useTranslations("Billing");
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20 sm:space-y-10">
      <header className="max-w-2xl">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-pitch">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-ink sm:text-5xl">
          {t("pricing.title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
          {t("pricing.description")}
        </p>
      </header>
      {checkoutStatus === "success" ? (
        <p
          role="status"
          className="rounded-xl border border-pitch/25 bg-pitch/[0.07] p-4 text-sm font-bold text-ink"
        >
          {t("checkout.success")}
        </p>
      ) : null}
      {checkoutStatus === "canceled" ? (
        <p
          role="status"
          className="rounded-xl border border-line bg-white p-4 text-sm font-bold text-ink"
        >
          {t("checkout.canceled")}
        </p>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-6 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-8">
          <p className="text-sm font-black text-muted">{t("plan.free")}</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.04em] text-ink">
            $0 <span className="text-base font-bold text-muted">MXN</span>
          </p>
          <p className="mt-2 text-sm text-muted">{t("pricing.freeInterval")}</p>
          <ul className="mt-7 space-y-3 text-sm text-ink" role="list">
            {["team", "matches", "statistics"].map((feature) => (
              <li key={feature} className="flex gap-2">
                <Check
                  aria-hidden="true"
                  className="size-4 shrink-0 text-pitch"
                />
                {t(`features.${feature}`)}
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line px-5 text-sm font-bold text-muted disabled:cursor-default"
          >
            {t("pricing.freeCurrent")}
          </button>
        </section>
        <section className="rounded-2xl border-2 border-pitch bg-white p-6 shadow-[0_18px_52px_rgba(0,163,49,0.12)] sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-pitch">{t("plan.pro")}</p>
            <span className="rounded-full bg-pitch/10 px-3 py-1 text-xs font-black text-pitch">
              {t("pricing.proBadge")}
            </span>
          </div>
          <p className="mt-3 text-4xl font-black tracking-[-0.04em] text-ink">
            $99 MXN / {t("pricing.month")}
          </p>
          <p className="mt-2 text-sm text-muted">{t("pricing.proInterval")}</p>
          <ul className="mt-7 space-y-3 text-sm text-ink" role="list">
            {["history", "templates", "support"].map((feature) => (
              <li key={feature} className="flex gap-2">
                <Check
                  aria-hidden="true"
                  className="size-4 shrink-0 text-pitch"
                />
                {t(`features.${feature}`)}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <UpgradeDialog />
          </div>
        </section>
      </div>
      <section className="flex items-start gap-3 rounded-2xl border border-line bg-white p-5 text-sm leading-6 text-muted">
        <LockKeyhole
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-pitch"
        />
        {t("pricing.billingNote")}
      </section>
    </div>
  );
}
