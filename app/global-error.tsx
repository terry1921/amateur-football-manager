"use client";

import { useEffect } from "react";
import { logClientError } from "@/lib/errors/log-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => logClientError(error, "global-route"), [error]);

  return (
    <html lang="en">
      <body className="grid min-h-dvh place-items-center bg-[#f6f9f7] px-5 py-12 font-sans text-[#071a36]">
        <main className="w-full max-w-md rounded-2xl border border-[#cce2cf] bg-white p-6 text-center shadow-[0_20px_60px_rgba(7,26,54,0.08)] sm:p-8">
          <h1 className="text-3xl font-black tracking-[-0.035em]">
            Something went wrong
          </h1>
          <p className="mt-3 leading-7 text-[#607086]">
            Matchday could not load this screen. Your saved team data was not
            changed.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 min-h-12 rounded-xl bg-[#00a331] px-5 text-sm font-bold text-white"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
