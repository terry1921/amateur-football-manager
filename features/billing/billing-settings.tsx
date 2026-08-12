"use client";

import { ExternalLink, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  formatBillingDate,
  type BillingAction,
  type BillingOverview,
} from "./ui-model";

type BillingSettingsProps = {
  overview: BillingOverview;
  locale: string;
  onPortal?: BillingAction;
  onCancel?: BillingAction;
  onResume?: BillingAction;
};

export function BillingSettings({
  overview,
  locale,
  onPortal,
  onCancel,
  onResume,
}: BillingSettingsProps) {
  const t = useTranslations("Billing");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const renewal = overview.renewalAt
    ? formatBillingDate(overview.renewalAt, locale)
    : null;
  const run = async (
    actionName: "portal" | "cancel" | "resume",
    action?: BillingAction,
  ) => {
    setPendingAction(actionName);
    setMessage(null);
    const result = action
      ? await action()
      : await fetch("/api/billing/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: actionName }),
        })
          .then(async (response) => {
            const data = (await response.json().catch(() => null)) as {
              url?: string;
            } | null;
            return response.ok
              ? { kind: "success" as const, redirectUrl: data?.url }
              : { kind: "error" as const, message: t("status.unavailable") };
          })
          .catch(() => ({
            kind: "error" as const,
            message: t("status.unavailable"),
          }));
    setPendingAction(null);
    if (result.kind === "error") return setMessage(result.message);
    if (result.redirectUrl) window.location.assign(result.redirectUrl);
    else setMessage(t("actions.completed"));
  };
  const status =
    overview.status === "unavailable"
      ? t("status.unavailable")
      : overview.status === "canceling" && renewal
        ? t("status.ends", { date: renewal })
        : overview.status === "active" && renewal
          ? t("status.renews", { date: renewal })
          : t(`status.${overview.status}`);
  const portalEnabled = overview.actions.portal && !pendingAction;
  const cancelEnabled = overview.actions.cancel && !pendingAction;
  const resumeEnabled = overview.actions.resume && !pendingAction;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20">
      <header>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-pitch">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-ink sm:text-4xl">
          {t("settings.title")}
        </h1>
        <p className="mt-3 leading-7 text-muted">{t("settings.description")}</p>
      </header>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-muted">
              {t("settings.currentPlan")}
            </p>
            <p className="mt-1 text-2xl font-black text-ink">
              {t(`plan.${overview.plan}`)}
            </p>
          </div>
          <span className="rounded-full bg-pitch/10 px-3 py-1.5 text-sm font-black text-pitch">
            {t(`status.label.${overview.status}`)}
          </span>
        </div>
        <p className="mt-5 text-sm leading-6 text-muted">{status}</p>
      </section>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-7">
        <h2 className="text-lg font-black text-ink">
          {t("settings.management")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {t("settings.managementDescription")}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!portalEnabled}
            onClick={() => run("portal", onPortal)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-not-allowed disabled:opacity-55"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            {t("actions.portal")}
          </button>
          {overview.status === "canceling" ? (
            <button
              type="button"
              disabled={!resumeEnabled}
              onClick={() => run("resume", onResume)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pitch px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-not-allowed disabled:opacity-55"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              {t("actions.resume")}
            </button>
          ) : overview.plan === "pro" ? (
            <button
              type="button"
              disabled={!cancelEnabled}
              onClick={() => run("cancel", onCancel)}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-not-allowed disabled:opacity-55"
            >
              {t("actions.cancel")}
            </button>
          ) : null}
        </div>
        {message ? (
          <p role="status" className="mt-4 text-sm text-muted">
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
