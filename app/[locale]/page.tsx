import { setRequestLocale } from "next-intl/server";
import { HomeContent } from "@/components/home-content";
import type { AppLocale } from "@/i18n/routing";

type HomePageProps = {
  params: Promise<{ locale: AppLocale }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent locale={locale} />;
}
