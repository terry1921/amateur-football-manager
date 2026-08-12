import { appError } from "@/lib/errors/error-codes";
import { getTeamSubscription } from "./data";
import {
  hasEntitlement,
  type Entitlement,
  type ResolvedTeamSubscription,
} from "./model";

export async function assertEntitlement(
  teamId: string,
  entitlement: Entitlement,
): Promise<ResolvedTeamSubscription> {
  const subscription = await getTeamSubscription(teamId);

  if (!hasEntitlement(subscription, entitlement)) {
    throw appError({
      code: "ENTITLEMENT_REQUIRED",
      category: "authorization",
      recoverable: false,
      retryable: false,
    });
  }

  return subscription;
}
