"use client";

import {
  BarChart3,
  CalendarRange,
  FileText,
  LayoutDashboard,
  Shield,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const navigation = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "team", href: "/team", icon: Shield },
  { key: "seasons", href: "/seasons", icon: CalendarRange },
  { key: "players", href: "/players", icon: UsersRound },
  { key: "matches", href: "/matches", icon: Trophy },
  { key: "statistics", href: "/statistics", icon: BarChart3 },
  { key: "content", href: "/content", icon: FileText },
] as const;

export function DashboardNavigation() {
  const t = useTranslations("DashboardShell");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("navigationLabel")}
      className="border-b border-line bg-white"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-4 sm:flex sm:gap-1 sm:px-6">
        {navigation.map(({ key, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden border-b-2 px-1 text-[0.625rem] font-bold transition sm:min-h-12 sm:flex-row sm:gap-2 sm:overflow-visible sm:px-3 sm:text-sm ${
                active
                  ? "border-pitch bg-pitch/[0.035] text-pitch"
                  : "border-transparent text-muted hover:border-pitch hover:text-ink"
              }`}
            >
              <Icon aria-hidden="true" className="size-4" />
              <span className="max-w-full truncate">{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
