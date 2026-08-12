import { BillingSettings } from "@/features/billing/billing-settings";
import { getTeamSubscription } from "@/features/billing/data";
import { toBillingOverview } from "@/features/billing/ui-model";
import type { AppLocale } from "@/i18n/routing";
import { getTeamAccess } from "@/features/teams/access";

export default async function BillingSettingsRoute({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const { team } = await getTeamAccess();
  if (!team) return null;
  const overview = toBillingOverview(await getTeamSubscription(team.id));
  // Integration point: supply checkout, portal, cancel, and resume server
  // actions after Task 028's payment-provider actions are available.
  return <BillingSettings locale={locale} overview={overview} />;
}
