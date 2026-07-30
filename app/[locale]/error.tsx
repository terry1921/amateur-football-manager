"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ApplicationError");

  useEffect(() => {
    // Keep raw backend details out of the rendered UI. Production monitoring
    // can replace this console boundary when observability is introduced.
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f9f7] px-5 py-12 text-ink">
      <section className="w-full max-w-md rounded-2xl border border-line bg-white p-6 text-center shadow-[0_20px_60px_rgba(7,26,54,0.08)] sm:p-8">
        <h1 className="text-3xl font-black tracking-[-0.035em]">
          {t("title")}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          {t("description")}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-12 rounded-xl bg-pitch px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          {t("action")}
        </button>
      </section>
    </main>
  );
}
