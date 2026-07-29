import { Construction } from "lucide-react";

export function ProtectedPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section>
      <h1 className="text-3xl font-black tracking-[-0.035em] sm:text-4xl">
        {title}
      </h1>
      <div className="mt-7 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-line bg-white px-6 py-12 text-center shadow-[0_16px_50px_rgba(7,26,54,0.05)]">
        <Construction aria-hidden="true" className="size-8 text-pitch" />
        <p className="mt-4 max-w-md text-base leading-7 text-muted">
          {description}
        </p>
      </div>
    </section>
  );
}
