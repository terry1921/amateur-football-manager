import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getBillingConfig } from "@/features/billing/config";
import { createBillingManagementStore } from "@/features/billing/server-store";
import { getTeamAccess } from "@/features/teams/access";
import { createNoopServerMonetizationAnalytics } from "@/lib/analytics/monetization";

const requestSchema = z.object({
  action: z.enum(["portal", "cancel", "resume"]),
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_subscription_action" },
      { status: 400 },
    );
  }

  const { team, user } = await getTeamAccess();
  if (!team || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const config = getBillingConfig();
    const subscription =
      await createBillingManagementStore().findSubscriptionForOwnedTeam(
        team.id,
        user.id,
      );
    if (!subscription) {
      return NextResponse.json(
        { error: "subscription_not_found" },
        { status: 404 },
      );
    }

    if (parsed.data.action === "portal") {
      if (!subscription.providerCustomerId) {
        return NextResponse.json(
          { error: "portal_unavailable" },
          { status: 409 },
        );
      }
      const portal = await config.provider.createCustomerPortalSession({
        customerId: subscription.providerCustomerId,
        returnUrl: config.portalReturnUrl,
      });
      return NextResponse.json({ url: portal.url });
    }

    if (!subscription.providerSubscriptionId) {
      return NextResponse.json(
        { error: "subscription_unavailable" },
        { status: 409 },
      );
    }
    if (parsed.data.action === "cancel") {
      if (subscription.cancelAtPeriodEnd) {
        return NextResponse.json(
          { error: "cancellation_already_scheduled" },
          { status: 409 },
        );
      }
      await config.provider.cancelSubscriptionAtPeriodEnd({
        subscriptionId: subscription.providerSubscriptionId,
      });
      await createNoopServerMonetizationAnalytics().track({
        name: "cancellation",
        properties: { timing: "period_end" },
      });
    } else {
      if (!subscription.cancelAtPeriodEnd) {
        return NextResponse.json(
          { error: "subscription_not_canceling" },
          { status: 409 },
        );
      }
      await config.provider.resumeSubscription({
        subscriptionId: subscription.providerSubscriptionId,
      });
    }
    // The webhook remains the sole authority for local subscription state.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "subscription_management_unavailable" },
      { status: 503 },
    );
  }
}
