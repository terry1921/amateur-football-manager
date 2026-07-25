import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  Flag,
  Shield,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { AppLocale } from "@/i18n/routing";

const workflow = [
  { key: "squad", icon: UsersRound },
  { key: "match", icon: Shield },
  { key: "callup", icon: ClipboardCheck },
  { key: "result", icon: Flag },
  { key: "stats", icon: BarChart3 },
] as const;

type HomePageProps = {
  params: Promise<{ locale: AppLocale }>;
};

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

          <button
            type="button"
            disabled
            className="mx-auto mt-7 flex min-h-14 w-full max-w-md cursor-not-allowed items-center justify-center gap-3 rounded-xl bg-pitch px-6 text-base font-bold text-white opacity-90 shadow-[0_12px_28px_rgba(0,159,45,0.18)] sm:mt-9 sm:text-lg"
          >
            {t("action")}
            <ArrowRight
              aria-hidden="true"
              className="size-5"
              strokeWidth={2.5}
            />
          </button>

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

        <div className="pitch-outline" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent locale={locale} />;
}
