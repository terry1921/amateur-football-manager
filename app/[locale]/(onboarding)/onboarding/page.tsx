import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import type { AppLocale } from "@/i18n/routing";
import { logoutAction } from "@/features/auth/actions";
import { createTeamAction } from "@/features/teams/actions";
import { OnboardingForm } from "@/features/teams/onboarding-form";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeInput } = await params;
  const locale = localeInput as AppLocale;
  const t = await getTranslations({ locale, namespace: "Onboarding" });
  const dashboardT = await getTranslations({
    locale,
    namespace: "DashboardShell",
  });
  const createTeam = createTeamAction.bind(null, locale);
  const logout = logoutAction.bind(null, locale);

  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-white text-ink">
      <div className="onboarding-field" aria-hidden="true" />
      <header className="relative z-10 border-b border-line bg-white px-5 py-3 sm:px-8 sm:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <span className="brand-wordmark">Matchday</span>
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-muted transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {dashboardT("logout")}
            </button>
          </form>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="text-center">
          <p className="text-sm font-medium text-muted">{t("progress")}</p>
          <p className="mt-1 text-base font-bold text-ink">{t("stepName")}</p>
          <h1 className="mt-7 text-4xl font-black tracking-[-0.04em] text-ink sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-muted sm:text-lg">
            {t("description")}
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-[0_22px_64px_rgba(7,26,54,0.06)] sm:p-8">
          <OnboardingForm action={createTeam} />
        </div>
      </section>
    </main>
  );
}
