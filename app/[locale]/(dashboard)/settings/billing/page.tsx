import { BillingSettings } from "@/features/billing/billing-settings";
import { getTeamSubscription } from "@/features/billing/data";
import { toBillingOverview } from "@/features/billing/ui-model";
import type { AppLocale } from "@/i18n/routing";
import { getTeamAccess } from "@/features/teams/access";
import { getBillingConfig } from "@/features/billing/config";
import { createBillingManagementStore } from "@/features/billing/server-store";

export default async function BillingSettingsRoute({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const { team, user } = await getTeamAccess();
  if (!team || !user) return null;
  const overview = toBillingOverview(await getTeamSubscription(team.id));
  try {
    getBillingConfig();
    const subscription =
      await createBillingManagementStore().findSubscriptionForOwnedTeam(
        team.id,
        user.id,
      );
    overview.actions = {
      checkout: false,
      portal: Boolean(subscription?.providerCustomerId),
      cancel:
        Boolean(subscription?.providerSubscriptionId) &&
        subscription?.cancelAtPeriodEnd === false &&
        overview.plan === "pro",
      resume:
        Boolean(subscription?.providerSubscriptionId) &&
        subscription?.cancelAtPeriodEnd === true &&
        overview.plan === "pro",
    };
  } catch {
    // Settings remain visible with unavailable actions when billing is not set up.
  }
  return <BillingSettings locale={locale} overview={overview} />;
}
