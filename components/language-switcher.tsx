"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type LanguageSwitcherProps = {
  locale: AppLocale;
};

const localeOptions = [
  { locale: "en", shortLabel: "EN", messageKey: "english" },
  { locale: "es", shortLabel: "ES", messageKey: "spanish" },
] as const;

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const t = useTranslations("LocaleSwitcher");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="flex items-center gap-1">
      {localeOptions.map((option) => {
        const isCurrent = option.locale === locale;

        return (
          <Link
            key={option.locale}
            href={pathname}
            locale={option.locale}
            aria-current={isCurrent ? "page" : undefined}
            aria-label={t(option.messageKey)}
            className={`rounded-md px-2.5 py-2 text-xs font-bold tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch ${
              isCurrent
                ? "bg-ink text-white"
                : "text-muted hover:bg-line/35 hover:text-ink"
            }`}
          >
            {option.shortLabel}
          </Link>
        );
      })}
    </nav>
  );
}
