import { NextResponse, type NextRequest } from "next/server";
import { getBillingConfig } from "@/features/billing/config";
import { createBillingEventStore } from "@/features/billing/server-store";
import { processBillingEvent } from "@/features/billing/webhooks";
import { createNoopServerMonetizationAnalytics } from "@/lib/analytics/monetization";

export const runtime = "nodejs";

function logWebhook(
  outcome: "rejected" | "processed" | "failed",
  eventType?: string,
) {
  console.info("[billing-webhook]", { provider: "stripe", outcome, eventType });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let event;
  try {
    const { provider } = getBillingConfig();
    event = await provider.verifyWebhook(
      rawBody,
      request.headers.get("stripe-signature"),
    );
  } catch {
    logWebhook("rejected");
    return NextResponse.json({ error: "invalid_webhook" }, { status: 400 });
  }

  try {
    await processBillingEvent(
      createBillingEventStore(),
      event,
      createNoopServerMonetizationAnalytics(),
    );
    logWebhook("processed", event.type);
    return NextResponse.json({ received: true });
  } catch {
    logWebhook("failed", event.type);
    return NextResponse.json(
      { error: "webhook_processing_failed" },
      { status: 500 },
    );
  }
}
