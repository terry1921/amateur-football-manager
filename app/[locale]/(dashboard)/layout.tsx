import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LogOut,
  Shield,
  Trophy,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { logoutAction } from "@/features/auth/actions";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const navigation = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "team", href: "/team", icon: Shield },
  { key: "players", href: "/players", icon: UsersRound },
  { key: "matches", href: "/matches", icon: Trophy },
  { key: "statistics", href: "/statistics", icon: BarChart3 },
  { key: "content", href: "/content", icon: FileText },
] as const;

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations({ locale, namespace: "DashboardShell" });
  const logout = logoutAction.bind(null, locale);

  return (
    <div className="min-h-dvh bg-[#f6f9f7] text-ink">
      <header className="border-b border-line bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/dashboard" className="brand-wordmark">
            Matchday
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-muted transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {t("logout")}
            </button>
          </form>
        </div>
      </header>
      <nav
        aria-label={t("navigationLabel")}
        className="overflow-x-auto border-b border-line bg-white"
      >
        <div className="mx-auto flex min-w-max max-w-6xl gap-1 px-4 sm:px-6">
          {navigation.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className="flex min-h-12 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-bold text-muted transition hover:border-pitch hover:text-ink"
            >
              <Icon aria-hidden="true" className="size-4" />
              {t(key)}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {children}
      </main>
    </div>
  );
}
