import type { BillingPlan, ResolvedTeamSubscription } from "./model";

export type BillingUiStatus =
  "active" | "canceling" | "canceled" | "past_due" | "unavailable";

export type BillingActionResult =
  | { kind: "success"; redirectUrl?: string }
  | { kind: "error"; message: string };

/**
 * Boundary for checkout, portal, cancel, and resume server actions. Connect
 * this interface to the provider layer without changing entitlements locally.
 */
export type BillingAction = () => Promise<BillingActionResult>;

export type BillingOverview = {
  plan: BillingPlan;
  status: BillingUiStatus;
  renewalAt: string | null;
  cancelAtPeriodEnd: boolean;
  actions: {
    checkout: boolean;
    portal: boolean;
    cancel: boolean;
    resume: boolean;
  };
};

export const freePlan = {
  id: "free" as const,
  price: 0,
  currency: "MXN" as const,
  interval: "month" as const,
};
export const proPlan = {
  id: "pro" as const,
  price: 99,
  currency: "MXN" as const,
  interval: "month" as const,
};

export const unavailableBillingOverview: BillingOverview = {
  plan: "free",
  status: "unavailable",
  renewalAt: null,
  cancelAtPeriodEnd: false,
  actions: { checkout: false, portal: false, cancel: false, resume: false },
};

export function toBillingOverview(
  subscription: ResolvedTeamSubscription,
): BillingOverview {
  const status: BillingUiStatus =
    subscription.cancelAtPeriodEnd && subscription.isActive
      ? "canceling"
      : subscription.status === "past_due"
        ? "past_due"
        : subscription.status === "canceled"
          ? "canceled"
          : subscription.isActive
            ? "active"
            : "unavailable";
  return {
    plan: subscription.plan,
    status,
    renewalAt: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    actions: unavailableBillingOverview.actions,
  };
}

export function formatBillingDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
    new Date(value),
  );
}
