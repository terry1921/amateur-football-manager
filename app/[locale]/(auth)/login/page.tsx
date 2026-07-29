import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { loginAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthPage } from "@/features/auth/auth-page";
import { redirectAuthenticated } from "@/features/auth/redirect-authenticated";

type LoginPageProps = {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ next?: string; notice?: string; error?: string }>;
};

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  await redirectAuthenticated(locale);
  const t = await getTranslations({ locale, namespace: "Auth.login" });
  const action = loginAction.bind(null, locale, query.next ?? "");

  return (
    <AuthPage
      locale={locale}
      title={t("title")}
      description={t("description")}
      footer={
        <>
          {t("registerPrompt")}{" "}
          <Link
            href="/register"
            className="font-bold text-pitch hover:underline"
          >
            {t("registerLink")}
          </Link>
        </>
      }
    >
      {query.notice === "password-updated" ? (
        <p
          role="status"
          className="mb-5 rounded-xl border border-pitch/25 bg-pitch/8 px-4 py-3 text-sm text-ink"
        >
          {t("passwordUpdated")}
        </p>
      ) : null}
      {query.error === "callback" ? (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {t("callbackError")}
        </p>
      ) : null}
      <AuthForm action={action} kind="login" />
    </AuthPage>
  );
}
