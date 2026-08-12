import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createCheckoutForAuthenticatedTeam } from "@/features/billing/checkout";
import { getBillingConfig } from "@/features/billing/config";
import { createClient } from "@/lib/supabase/server";

const checkoutRequestSchema = z.object({ teamId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const parsed = checkoutRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_checkout_request" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const config = getBillingConfig();
    const result = await createCheckoutForAuthenticatedTeam({
      teamId: parsed.data.teamId,
      userId: user.id,
      store: {
        async isTeamOwnedByUser(teamId, userId) {
          const { data, error } = await supabase
            .from("teams")
            .select("id")
            .eq("id", teamId)
            .eq("owner_id", userId)
            .maybeSingle();
          if (error) throw error;
          return Boolean(data);
        },
      },
      ...config,
    });
    if (result.kind === "forbidden") {
      return NextResponse.json({ error: "team_not_found" }, { status: 404 });
    }
    return NextResponse.json({ url: result.url });
  } catch {
    return NextResponse.json(
      { error: "checkout_unavailable" },
      { status: 503 },
    );
  }
}
