import { redirect } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getTeamAccess } from "@/features/teams/access";

export async function redirectAuthenticated(locale: AppLocale) {
  const { user, team } = await getTeamAccess();

  if (user) redirect(`/${locale}/${team ? "dashboard" : "onboarding"}`);
}
