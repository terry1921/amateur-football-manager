import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { resetPasswordAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthPage } from "@/features/auth/auth-page";

type ResetPasswordPageProps = { params: Promise<{ locale: AppLocale }> };

export default async function ResetPasswordPage({
  params,
}: ResetPasswordPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth.resetPassword" });
  const action = resetPasswordAction.bind(null, locale);

  return (
    <AuthPage locale={locale} title={t("title")} description={t("description")}>
      <AuthForm action={action} kind="resetPassword" />
    </AuthPage>
  );
}
