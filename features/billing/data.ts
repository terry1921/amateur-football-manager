import { cache } from "react";
import { mapBackendError } from "@/lib/errors/map-backend-error";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import {
  resolveTeamSubscription,
  type ResolvedTeamSubscription,
  type SubscriptionSnapshot,
} from "./model";

const subscriptionColumns =
  "id, plan, status, cancel_at_period_end, current_period_start, current_period_end";

export const getTeamSubscription = cache(
  async (teamId: string): Promise<ResolvedTeamSubscription> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select(subscriptionColumns)
      .eq("team_id", teamId)
      .maybeSingle();

    if (error) throw mapBackendError(error, "billing");

    return resolveTeamSubscription(
      teamId,
      data as Pick<
        Tables<"subscriptions">,
        | "id"
        | "plan"
        | "status"
        | "cancel_at_period_end"
        | "current_period_start"
        | "current_period_end"
      > | null as SubscriptionSnapshot | null,
    );
  },
);
