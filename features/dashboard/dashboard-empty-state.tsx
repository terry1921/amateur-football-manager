import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  statusLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  statusLabel?: string;
}) {
  return (
    <div className="flex min-h-36 items-start gap-4 p-5 sm:p-6">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-pitch/8 text-pitch">
        <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-black tracking-[-0.02em] text-ink">
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        {actionLabel ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {actionHref ? (
              <Link
                href={actionHref}
                className="inline-flex min-h-11 items-center rounded-lg bg-pitch px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
              >
                {actionLabel}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex min-h-11 cursor-not-allowed items-center rounded-lg border border-line bg-[#f6f9f7] px-4 text-sm font-bold text-muted"
              >
                {actionLabel}
              </span>
            )}
            {statusLabel ? (
              <span className="text-xs font-bold text-muted">
                {statusLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
