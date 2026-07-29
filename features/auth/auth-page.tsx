import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type AuthPageProps = {
  locale: AppLocale;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthPage({
  locale,
  title,
  description,
  children,
  footer,
}: AuthPageProps) {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div className="field-markings" aria-hidden="true" />
      <header className="relative z-10 border-b border-line/80 px-5 py-3 sm:px-8 sm:py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="brand-wordmark">
            Matchday
          </Link>
          <LanguageSwitcher locale={locale} />
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:px-8 sm:py-14">
        <div className="rounded-2xl border border-line bg-white p-6 shadow-[0_24px_70px_rgba(7,26,54,0.09)] sm:p-8">
          <h1 className="text-3xl font-black tracking-[-0.035em] text-ink sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-base leading-7 text-muted">{description}</p>
          <div className="mt-7">{children}</div>
          {footer ? (
            <div className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">
              {footer}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
