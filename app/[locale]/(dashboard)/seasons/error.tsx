"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function SeasonsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Seasons.error");
  useEffect(() => console.error(error), [error]);

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-6 sm:p-8">
      <h1 className="text-3xl font-black tracking-[-0.035em] text-ink">
        {t("title")}
      </h1>
      <p className="mt-3 leading-7 text-muted">{t("description")}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 min-h-12 rounded-xl bg-pitch px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        {t("action")}
      </button>
    </section>
  );
}
