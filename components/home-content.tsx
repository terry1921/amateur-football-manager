import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardCheck,
  Flag,
  LockKeyhole,
  Shield,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { planDefinitions } from "@/features/billing/model";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

const workflow = [
  { key: "squad", icon: UsersRound },
  { key: "match", icon: Shield },
  { key: "callup", icon: ClipboardCheck },
  { key: "result", icon: Flag },
  { key: "stats", icon: BarChart3 },
] as const;

const freePlanItems = [
  "players",
  "history",
  "templates",
  "leaderboards",
] as const;

const proPlanItems = [
  "players",
  "history",
  "templates",
  "statistics",
  "exports",
] as const;

export function HomeContent({ locale }: { locale: AppLocale }) {
  const t = useTranslations("Home");

  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div className="field-markings" aria-hidden="true" />

      <header className="relative z-10 border-b border-line/80 px-5 py-3 sm:px-8 sm:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <span className="brand-wordmark">Matchday</span>
          <LanguageSwitcher locale={locale} />
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-5 py-12 text-center sm:px-8 sm:py-16 lg:justify-center lg:py-20">
        <div className="max-w-4xl">
          <h1
            aria-label={t("heading")}
            className="display-type text-[clamp(3.25rem,13vw,7.5rem)] leading-[0.84] uppercase tracking-[-0.035em] text-ink"
          >
            {t("headingFirstLine")}
            <span className="mt-2 block">{t("headingSecondLine")}</span>
            <span className="mt-2 block text-pitch">
              {t("headingAccentLine")}
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-lg leading-7 text-muted sm:mt-9 sm:text-xl sm:leading-8">
            {t("description")}
          </p>

          <Link
            href="/register"
            className="mx-auto mt-7 flex min-h-14 w-full max-w-md items-center justify-center gap-3 rounded-xl bg-pitch px-6 text-base font-bold text-white shadow-[0_12px_28px_rgba(0,159,45,0.18)] transition hover:bg-[#008f2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch sm:mt-9 sm:text-lg"
          >
            {t("action")}
            <ArrowRight
              aria-hidden="true"
              className="size-5"
              strokeWidth={2.5}
            />
          </Link>

          <p className="mt-4 text-sm font-medium text-muted">{t("tagline")}</p>
        </div>

        <ol
          id="workflow"
          aria-label={t("workflowLabel")}
          className="workflow-line relative mt-14 grid w-full max-w-3xl grid-cols-5 gap-1 sm:mt-16 sm:gap-4"
        >
          {workflow.map(({ key, icon: Icon }) => (
            <li key={key} className="flex min-w-0 flex-col items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full border border-pitch/40 bg-white text-pitch sm:size-14">
                <Icon
                  aria-hidden="true"
                  className="size-5 sm:size-6"
                  strokeWidth={2}
                />
              </span>
              <span className="text-[0.65rem] font-bold tracking-[-0.02em] text-ink sm:text-sm">
                {t(`workflow.${key}`)}
              </span>
            </li>
          ))}
        </ol>

        <section
          aria-labelledby="home-pricing-title"
          className="mt-20 w-full max-w-5xl text-left sm:mt-24"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-pitch">
              {t("pricing.eyebrow")}
            </p>
            <h2
              id="home-pricing-title"
              className="mt-3 text-3xl font-black tracking-[-0.04em] text-ink sm:text-4xl"
            >
              {t("pricing.title")}
            </h2>
            <p className="mt-3 text-base leading-7 text-muted">
              {t("pricing.description")}
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-line bg-white p-6 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-8">
              <h3 className="text-sm font-black text-muted">
                {t("pricing.free.name")}
              </h3>
              <p className="mt-3 text-4xl font-black tracking-[-0.04em] text-ink">
                {t("pricing.free.price")}
                <span className="text-base font-bold text-muted">
                  {t("pricing.free.interval")}
                </span>
              </p>
              <p className="mt-2 text-sm text-muted">
                {t("pricing.free.description")}
              </p>
              <ul className="mt-7 space-y-3 text-sm text-ink" role="list">
                {freePlanItems.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-pitch"
                    />
                    {t(`pricing.free.items.${item}`, {
                      count:
                        item === "players"
                          ? (planDefinitions.free.limits.maxPlayers ?? 0)
                          : item === "history"
                            ? (planDefinitions.free.limits
                                .maxHistoricalSeasons ?? 0)
                            : item === "templates"
                              ? (planDefinitions.free.limits
                                  .maxSocialTemplates ?? 0)
                              : (planDefinitions.free.limits
                                  .maxLeaderboardRows ?? 0),
                    })}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line px-5 text-sm font-bold text-ink transition hover:border-pitch hover:text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
              >
                {t("pricing.free.cta")}
              </Link>
            </article>

            <article className="rounded-2xl border-2 border-pitch bg-white p-6 shadow-[0_18px_52px_rgba(0,163,49,0.12)] sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-pitch">
                  {t("pricing.pro.name")}
                </h3>
                <span className="rounded-full bg-pitch/10 px-3 py-1 text-xs font-black text-pitch">
                  {t("pricing.pro.badge")}
                </span>
              </div>
              <p className="mt-3 text-4xl font-black tracking-[-0.04em] text-ink">
                {t("pricing.pro.price")}
                <span className="text-base font-bold text-muted">
                  {t("pricing.pro.interval")}
                </span>
              </p>
              <p className="mt-2 text-sm text-muted">
                {t("pricing.pro.description")}
              </p>
              <ul className="mt-7 space-y-3 text-sm text-ink" role="list">
                {proPlanItems.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-pitch"
                    />
                    {t(`pricing.pro.items.${item}`)}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-pitch px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,163,49,0.18)] transition hover:bg-[#008f2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
              >
                {t("pricing.pro.cta")}
                <ArrowRight aria-hidden="true" className="ml-2 size-4" />
              </Link>
            </article>
          </div>

          <p className="mx-auto mt-5 flex max-w-2xl items-start gap-2 text-center text-xs leading-5 text-muted sm:justify-center">
            <LockKeyhole
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0"
            />
            {t("pricing.note")}
          </p>
        </section>

        <div className="pitch-outline" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}
