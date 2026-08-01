import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section
      role="alert"
      className="mx-auto w-full max-w-2xl rounded-2xl border border-red-200 bg-white p-6 shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red-50 text-red-700">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-[-0.03em] text-ink sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {onRetry && retryLabel ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-pitch px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            {retryLabel}
          </button>
        ) : null}
        {backHref && backLabel ? (
          <Link
            href={backHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#b8c5d2] px-5 text-sm font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {backLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
