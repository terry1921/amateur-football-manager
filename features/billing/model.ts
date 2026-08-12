export const billingPlans = ["free", "pro"] as const;
export type BillingPlan = (typeof billingPlans)[number];

export const subscriptionStatuses = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "paused",
] as const;
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];

export const entitlements = [
  "premium_social_templates",
  "high_resolution_exports",
  "full_historical_access",
  "advanced_statistics",
  "full_leaderboards",
  "watermark_removal",
] as const;
export type Entitlement = (typeof entitlements)[number];

export type PlanLimits = {
  maxPlayers: number | null;
  maxHistoricalSeasons: number | null;
  maxSocialTemplates: number | null;
  maxLeaderboardRows: number | null;
};

export type PlanDefinition = {
  id: BillingPlan;
  entitlements: readonly Entitlement[];
  limits: PlanLimits;
};

export const planDefinitions: Record<BillingPlan, PlanDefinition> = {
  free: {
    id: "free",
    entitlements: [],
    limits: {
      maxPlayers: 30,
      maxHistoricalSeasons: 1,
      maxSocialTemplates: 1,
      maxLeaderboardRows: 10,
    },
  },
  pro: {
    id: "pro",
    entitlements,
    limits: {
      maxPlayers: null,
      maxHistoricalSeasons: null,
      maxSocialTemplates: null,
      maxLeaderboardRows: null,
    },
  },
};

export type SubscriptionSnapshot = {
  id: string;
  plan: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
};

export type ResolvedTeamSubscription = {
  teamId: string;
  subscriptionId: string | null;
  plan: BillingPlan;
  status: SubscriptionStatus;
  isActive: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  entitlements: readonly Entitlement[];
  limits: PlanLimits;
  source: "default" | "subscription";
};

const statusAliases: Record<string, SubscriptionStatus> = {
  active: "active",
  trialing: "trialing",
  past_due: "past_due",
  "past-due": "past_due",
  canceled: "canceled",
  cancelled: "canceled",
  unpaid: "unpaid",
  incomplete: "incomplete",
  incomplete_expired: "incomplete",
  paused: "paused",
};

export function normalizeBillingPlan(value: unknown): BillingPlan {
  return value === "pro" ? "pro" : "free";
}

export function normalizeSubscriptionStatus(
  value: unknown,
): SubscriptionStatus {
  if (typeof value !== "string") return "incomplete";
  return statusAliases[value.trim().toLowerCase()] ?? "incomplete";
}

export function subscriptionHasAccess(
  status: SubscriptionStatus,
  currentPeriodEnd: string | null,
  now = new Date(),
) {
  if (status === "active" || status === "trialing") {
    if (!currentPeriodEnd) return false;

    const periodEnd = Date.parse(currentPeriodEnd);
    return Number.isFinite(periodEnd) && periodEnd > now.getTime();
  }

  if (status !== "canceled" || !currentPeriodEnd) return false;

  const periodEnd = Date.parse(currentPeriodEnd);
  return Number.isFinite(periodEnd) && periodEnd > now.getTime();
}

export function resolveTeamSubscription(
  teamId: string,
  snapshot: SubscriptionSnapshot | null,
  now = new Date(),
): ResolvedTeamSubscription {
  const status = normalizeSubscriptionStatus(snapshot?.status);
  const isActive = snapshot
    ? subscriptionHasAccess(status, snapshot.current_period_end, now)
    : true;
  const plan = isActive ? normalizeBillingPlan(snapshot?.plan) : "free";
  const definition = planDefinitions[plan];

  return {
    teamId,
    subscriptionId: snapshot?.id ?? null,
    plan,
    status: snapshot ? status : "active",
    isActive,
    cancelAtPeriodEnd: snapshot?.cancel_at_period_end ?? false,
    currentPeriodStart: snapshot?.current_period_start ?? null,
    currentPeriodEnd: snapshot?.current_period_end ?? null,
    entitlements: definition.entitlements,
    limits: definition.limits,
    source: snapshot ? "subscription" : "default",
  };
}

export function hasEntitlement(
  subscription: ResolvedTeamSubscription,
  entitlement: Entitlement,
) {
  return subscription.entitlements.includes(entitlement);
}

export function hasPremiumFeature(
  subscription: ResolvedTeamSubscription,
  feature: Entitlement,
) {
  return hasEntitlement(subscription, feature);
}

export function canCreateWithinLimit(
  subscription: ResolvedTeamSubscription,
  limit: keyof PlanLimits,
  currentCount: number,
) {
  const maximum = subscription.limits[limit];
  return (
    maximum === null ||
    (Number.isInteger(currentCount) &&
      currentCount >= 0 &&
      currentCount < maximum)
  );
}

export function canAccessHistoricalSeason(
  subscription: ResolvedTeamSubscription,
  historicalSeasonIndex: number,
) {
  const maximum = subscription.limits.maxHistoricalSeasons;
  return (
    maximum === null ||
    (Number.isInteger(historicalSeasonIndex) &&
      historicalSeasonIndex >= 0 &&
      historicalSeasonIndex < maximum)
  );
}

export function canUseSocialTemplate(
  subscription: ResolvedTeamSubscription,
  templateIndex: number,
) {
  const maximum = subscription.limits.maxSocialTemplates;
  return (
    maximum === null ||
    (Number.isInteger(templateIndex) &&
      templateIndex >= 0 &&
      templateIndex < maximum)
  );
}

export function limitLeaderboardRows<T>(
  subscription: ResolvedTeamSubscription,
  rows: readonly T[],
) {
  const maximum = subscription.limits.maxLeaderboardRows;
  return {
    rows: maximum === null ? [...rows] : rows.slice(0, maximum),
    isPreview: maximum !== null,
  };
}
