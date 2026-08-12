import {
  PricingPage,
  type CheckoutStatus,
} from "@/features/billing/pricing-page";
import { getBillingConfig } from "@/features/billing/config";
import { getTeamAccess } from "@/features/teams/access";

export default async function PricingRoute({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const { team } = await getTeamAccess();
  const checkoutStatus: CheckoutStatus =
    checkout === "success" || checkout === "canceled" ? checkout : "idle";
  let checkoutAvailable = false;

  try {
    getBillingConfig();
    checkoutAvailable = Boolean(team);
  } catch {
    checkoutAvailable = false;
  }

  return (
    <PricingPage
      checkoutStatus={checkoutStatus}
      teamId={team?.id}
      checkoutAvailable={checkoutAvailable}
    />
  );
}
