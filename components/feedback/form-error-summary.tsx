"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export function FormErrorSummary({
  message,
  children,
}: {
  message?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);

  if (!message) return null;

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      aria-live="assertive"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800 outline-none focus-visible:ring-2 focus-visible:ring-red-600"
    >
      <p>{message}</p>
      {children}
    </div>
  );
}
