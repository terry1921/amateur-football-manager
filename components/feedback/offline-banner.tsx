"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOnlineStatus } from "./use-online-status";

export function OfflineBanner() {
  const t = useTranslations("Offline");
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("message")}
      className="sticky top-0 z-50 flex min-h-11 items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-bold text-amber-950 shadow-sm"
    >
      <WifiOff aria-hidden="true" className="size-4 shrink-0" />
      <span>{t("message")}</span>
    </div>
  );
}
