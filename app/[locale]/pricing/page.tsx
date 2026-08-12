import {
  PricingPage,
  type CheckoutStatus,
} from "@/features/billing/pricing-page";

export default async function PricingRoute({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const checkoutStatus: CheckoutStatus =
    checkout === "success" || checkout === "canceled" ? checkout : "idle";
  return <PricingPage checkoutStatus={checkoutStatus} />;
}
