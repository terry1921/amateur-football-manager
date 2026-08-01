import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { DashboardNavigation } from "@/components/dashboard-navigation";
import { InstallAppButton } from "@/components/install-app-button";
import { logoutAction } from "@/features/auth/actions";
import { enforceAccess } from "@/features/teams/access";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type DashboardLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale: localeInput } = await params;
  const locale = localeInput as AppLocale;
  await enforceAccess("application", locale);

  const t = await getTranslations({ locale, namespace: "DashboardShell" });
  const logout = logoutAction.bind(null, locale);

  return (
    <div className="min-h-dvh bg-[#f6f9f7] text-ink">
      <header className="dashboard-header border-b border-line bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/dashboard" className="brand-wordmark">
            Matchday
          </Link>
          <div className="flex items-center gap-2">
            <InstallAppButton />
            <form action={logout}>
              <button
                type="submit"
                className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-muted transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
              >
                <LogOut aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">{t("logout")}</span>
                <span className="sm:hidden">{t("logoutShort")}</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <DashboardNavigation />
      <main className="dashboard-main mx-auto w-full max-w-6xl px-5 py-8 pb-28 sm:px-8 sm:py-14 sm:pb-32 lg:pb-14">
        {children}
      </main>
    </div>
  );
}
