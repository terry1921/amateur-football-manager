import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { forgotPasswordAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthPage } from "@/features/auth/auth-page";

type ForgotPasswordPageProps = { params: Promise<{ locale: AppLocale }> };

export default async function ForgotPasswordPage({
  params,
}: ForgotPasswordPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.forgotPassword" });
  const action = forgotPasswordAction.bind(null, locale);

  return (
    <AuthPage
      locale={locale}
      title={t("title")}
      description={t("description")}
      footer={
        <Link href="/login" className="font-bold text-pitch hover:underline">
          {t("backToLogin")}
        </Link>
      }
    >
      <AuthForm action={action} kind="forgotPassword" />
    </AuthPage>
  );
}
