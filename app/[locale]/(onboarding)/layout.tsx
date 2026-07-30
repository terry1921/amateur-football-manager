import type { ReactNode } from "react";
import type { AppLocale } from "@/i18n/routing";
import { enforceAccess } from "@/features/teams/access";

export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeInput } = await params;
  const locale = localeInput as AppLocale;
  await enforceAccess("onboarding", locale);
  return children;
}
