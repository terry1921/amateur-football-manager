"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function UpgradeDialog({
  teamId,
  checkoutAvailable = false,
  triggerLabel,
}: {
  teamId?: string;
  checkoutAvailable?: boolean;
  triggerLabel?: string;
}) {
  const t = useTranslations("Billing");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCheckout = Boolean(teamId) && checkoutAvailable;

  async function startCheckout() {
    if (!canCheckout || !teamId) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      const result = (await response.json().catch(() => null)) as {
        url?: unknown;
      } | null;

      if (!response.ok || typeof result?.url !== "string") {
        throw new Error("checkout_unavailable");
      }

      window.location.assign(result.url);
    } catch {
      setError(t("upgrade.unavailable"));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-pitch px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,163,49,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        {triggerLabel ?? t("pricing.choosePro")}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-ink/45 p-3 sm:items-center sm:justify-center sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="upgrade-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_24px_70px_rgba(7,26,54,0.28)] sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-pitch">
                  {t("plan.pro")}
                </p>
                <h2
                  id="upgrade-title"
                  className="mt-1 text-2xl font-black tracking-[-0.03em] text-ink"
                >
                  {t("upgrade.title")}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="grid size-11 place-items-center rounded-lg text-muted hover:bg-[#f6f9f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <p className="mt-3 leading-6 text-muted">
              {t("upgrade.description")}
            </p>
            <ul className="mt-5 space-y-2 text-sm text-ink" role="list">
              {["history", "templates", "support"].map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-pitch"
                  />
                  {t(`features.${feature}`)}
                </li>
              ))}
            </ul>
            <p className="mt-5 rounded-xl bg-[#f6f9f7] p-3 text-sm font-medium text-ink">
              {t("upgrade.confirmation")}
            </p>
            {!canCheckout ? (
              <p role="status" className="mt-3 text-sm text-muted">
                {t("upgrade.unavailable")}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!canCheckout || pending}
              onClick={startCheckout}
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-pitch px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-not-allowed disabled:opacity-55"
            >
              {pending
                ? t("actions.loading")
                : canCheckout
                  ? t("upgrade.checkout")
                  : t("upgrade.unavailable")}
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-muted">
              {t("upgrade.noCharge")}
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
