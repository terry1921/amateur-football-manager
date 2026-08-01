"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/feedback/error-state";
import { logClientError } from "@/lib/errors/log-error";

export default function MatchesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Matches.error");
  useEffect(() => logClientError(error, "matches-route"), [error]);

  return (
    <ErrorState
      title={t("title")}
      description={t("description")}
      retryLabel={t("action")}
      onRetry={reset}
    />
  );
}
