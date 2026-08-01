"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/feedback/error-state";
import { logClientError } from "@/lib/errors/log-error";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ApplicationError");

  useEffect(() => {
    logClientError(error, "locale-route");
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f9f7] px-5 py-12 text-ink">
      <ErrorState
        title={t("title")}
        description={t("description")}
        retryLabel={t("action")}
        onRetry={reset}
      />
    </main>
  );
}
