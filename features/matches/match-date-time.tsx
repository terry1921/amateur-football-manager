"use client";

import { useLocale } from "next-intl";
import { useViewerTimeZone } from "./use-viewer-time-zone";

export function MatchDateTime({
  value,
  dateOnly = false,
}: {
  value: string;
  dateOnly?: boolean;
}) {
  const locale = useLocale();
  const timeZone = useViewerTimeZone();
  const formatted = timeZone
    ? new Intl.DateTimeFormat(locale, {
        ...(dateOnly
          ? { dateStyle: "medium" as const }
          : {
              dateStyle: "long" as const,
              timeStyle: "short" as const,
            }),
        timeZone,
      }).format(new Date(value))
    : "—";

  return (
    <time dateTime={value} aria-live="polite">
      {formatted}
    </time>
  );
}
