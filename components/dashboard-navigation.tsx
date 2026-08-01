"use client";

import {
  BarChart3,
  CalendarRange,
  FileText,
  LayoutDashboard,
  MoreHorizontal,
  Shield,
  Trophy,
  Medal,
  Share2,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";

const navigation = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "team", href: "/team", icon: Shield },
  { key: "seasons", href: "/seasons", icon: CalendarRange },
  { key: "players", href: "/players", icon: UsersRound },
  { key: "matches", href: "/matches", icon: Trophy },
  { key: "statistics", href: "/statistics", icon: BarChart3 },
  { key: "leaderboards", href: "/leaderboards", icon: Medal },
  { key: "social", href: "/social", icon: Share2 },
  { key: "content", href: "/content", icon: FileText },
] as const;

const primaryNavigation = navigation.filter(({ key }) =>
  ["dashboard", "matches", "players", "statistics"].includes(key),
);
const moreNavigation = navigation.filter(({ key }) =>
  ["team", "seasons", "leaderboards", "social", "content"].includes(key),
);

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavigationLink({
  item,
  active,
  label,
  onNavigate,
}: {
  item: (typeof navigation)[number];
  active: boolean;
  label: string;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={
        "flex min-w-0 items-center justify-center gap-2 font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch " +
        (active
          ? "border-pitch bg-pitch/[0.035] text-pitch"
          : "border-transparent text-muted hover:border-pitch hover:text-ink")
      }
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

export function DashboardNavigation() {
  const t = useTranslations("DashboardShell");
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreNavigation.some((item) =>
    isActive(pathname, item.href),
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => setMoreOpen(false), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  return (
    <>
      <nav
        aria-label={t("navigationLabel")}
        className="hidden border-b border-line bg-white lg:block"
      >
        <div className="mx-auto flex max-w-6xl gap-1 px-6">
          {navigation.map((item) => (
            <NavigationLink
              key={item.key}
              item={item}
              active={isActive(pathname, item.href)}
              label={t(item.key)}
              onNavigate={() => setMoreOpen(false)}
            />
          ))}
        </div>
      </nav>

      <nav
        aria-label={t("navigationLabel")}
        className="mobile-bottom-navigation fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 shadow-[0_-10px_30px_rgba(7,26,54,0.08)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {primaryNavigation.map((item) => (
            <NavigationLink
              key={item.key}
              item={item}
              active={isActive(pathname, item.href)}
              label={t(item.key)}
              onNavigate={() => setMoreOpen(false)}
            />
          ))}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-menu"
            onClick={() => setMoreOpen((open) => !open)}
            className={
              "flex min-w-0 flex-col items-center justify-center gap-1 border-t-2 px-1 text-[0.65rem] " +
              (moreActive || moreOpen
                ? "border-pitch text-pitch"
                : "border-transparent text-muted")
            }
          >
            {moreOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <MoreHorizontal aria-hidden="true" className="size-5" />
            )}
            <span className="max-w-full truncate">
              {moreOpen ? t("closeMore") : t("more")}
            </span>
          </button>
        </div>
      </nav>

      {moreOpen ? (
        <div
          id="mobile-more-menu"
          className="mobile-more-sheet fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 rounded-2xl border border-line bg-white p-2 shadow-[0_20px_60px_rgba(7,26,54,0.18)] lg:hidden"
        >
          <p className="px-3 pb-2 pt-1 text-xs font-black uppercase tracking-[0.1em] text-muted">
            {t("more")}
          </p>
          <div className="grid grid-cols-2 gap-1">
            {moreNavigation.map((item) => (
              <NavigationLink
                key={item.key}
                item={item}
                active={isActive(pathname, item.href)}
                label={t(item.key)}
                onNavigate={() => setMoreOpen(false)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
