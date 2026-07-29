import { getTranslations } from "next-intl/server";
import { ProtectedPlaceholder } from "@/components/protected-placeholder";
import type { AppLocale } from "@/i18n/routing";

export default async function MatchesPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "ProtectedPages.matches",
  });
  return (
    <ProtectedPlaceholder title={t("title")} description={t("description")} />
  );
}
