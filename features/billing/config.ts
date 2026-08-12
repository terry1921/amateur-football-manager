import { getAppUrl } from "@/lib/auth/urls";
import { createStripeBillingProvider } from "./stripe-provider";

type BillingEnvironment = {
  BILLING_PROVIDER?: string;
  BILLING_STRIPE_SECRET_KEY?: string;
  BILLING_STRIPE_WEBHOOK_SECRET?: string;
  BILLING_STRIPE_PRO_PRICE_ID?: string;
};

function readBillingEnvironment(): BillingEnvironment {
  return {
    BILLING_PROVIDER: process.env.BILLING_PROVIDER,
    BILLING_STRIPE_SECRET_KEY: process.env.BILLING_STRIPE_SECRET_KEY,
    BILLING_STRIPE_WEBHOOK_SECRET: process.env.BILLING_STRIPE_WEBHOOK_SECRET,
    BILLING_STRIPE_PRO_PRICE_ID: process.env.BILLING_STRIPE_PRO_PRICE_ID,
  };
}

export function getBillingConfig(
  environment: BillingEnvironment = readBillingEnvironment(),
) {
  if (environment.BILLING_PROVIDER !== "stripe") {
    throw new Error("BILLING_PROVIDER must be configured as stripe");
  }
  const required = [
    "BILLING_STRIPE_SECRET_KEY",
    "BILLING_STRIPE_WEBHOOK_SECRET",
    "BILLING_STRIPE_PRO_PRICE_ID",
  ] as const;
  const missing = required.filter((key) => !environment[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required billing environment variables: ${missing.join(", ")}`,
    );
  }

  return {
    provider: createStripeBillingProvider({
      secretKey: environment.BILLING_STRIPE_SECRET_KEY!,
      webhookSecret: environment.BILLING_STRIPE_WEBHOOK_SECRET!,
    }),
    priceId: environment.BILLING_STRIPE_PRO_PRICE_ID!,
    successUrl: getAppUrl("/billing/success?session_id={CHECKOUT_SESSION_ID}"),
    cancelUrl: getAppUrl("/billing/cancel"),
  };
}
