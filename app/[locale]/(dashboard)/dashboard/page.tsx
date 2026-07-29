import { getTranslations } from "next-intl/server";
import { ProtectedPlaceholder } from "@/components/protected-placeholder";
import type { AppLocale } from "@/i18n/routing";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "ProtectedPages.dashboard",
  });
  return (
    <ProtectedPlaceholder title={t("title")} description={t("description")} />
  );
}
