import { Link } from "@/i18n/navigation";
import { SearchX } from "lucide-react";

export function NotFoundState({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center rounded-2xl border border-line bg-white p-8 text-center shadow-[0_14px_44px_rgba(7,26,54,0.04)] sm:p-12">
      <span className="grid size-14 place-items-center rounded-full bg-[#f1f6f3] text-muted">
        <SearchX aria-hidden="true" className="size-7" />
      </span>
      <h1 className="mt-5 text-3xl font-black tracking-[-0.035em] text-ink">
        {title}
      </h1>
      <p className="mt-3 max-w-md leading-7 text-muted">{description}</p>
      <Link
        href={backHref}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-pitch px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
      >
        {backLabel}
      </Link>
    </main>
  );
}
