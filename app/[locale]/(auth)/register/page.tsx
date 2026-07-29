import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { registerAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { AuthPage } from "@/features/auth/auth-page";
import { redirectAuthenticated } from "@/features/auth/redirect-authenticated";

type RegisterPageProps = { params: Promise<{ locale: AppLocale }> };

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params;
  await redirectAuthenticated(locale);
  const t = await getTranslations({ locale, namespace: "Auth.register" });
  const action = registerAction.bind(null, locale);

  return (
    <AuthPage
      locale={locale}
      title={t("title")}
      description={t("description")}
      footer={
        <>
          {t("loginPrompt")}{" "}
          <Link href="/login" className="font-bold text-pitch hover:underline">
            {t("loginLink")}
          </Link>
        </>
      }
    >
      <AuthForm action={action} kind="register" />
    </AuthPage>
  );
}
