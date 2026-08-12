import { appError } from "@/lib/errors/error-codes";
import { getTeamSubscription } from "./data";
import {
  canAccessHistoricalSeason,
  canCreateWithinLimit,
  canUseSocialTemplate,
  hasPremiumFeature,
  type Entitlement,
  type ResolvedTeamSubscription,
} from "./model";

export async function assertEntitlement(
  teamId: string,
  entitlement: Entitlement,
): Promise<ResolvedTeamSubscription> {
  const subscription = await getTeamSubscription(teamId);

  if (!hasPremiumFeature(subscription, entitlement)) {
    throw appError({
      code: "ENTITLEMENT_REQUIRED",
      category: "authorization",
      recoverable: false,
      retryable: false,
    });
  }

  return subscription;
}

function limitError() {
  return appError({
    code: "PLAN_LIMIT_REACHED",
    category: "authorization",
    recoverable: false,
    retryable: false,
  });
}

export async function assertCanCreatePlayer(
  teamId: string,
  currentCount: number,
) {
  const subscription = await getTeamSubscription(teamId);
  if (!canCreateWithinLimit(subscription, "maxPlayers", currentCount)) {
    throw limitError();
  }
  return subscription;
}

export async function assertHistoricalSeasonAccess(
  teamId: string,
  historicalSeasonIndex: number,
) {
  const subscription = await getTeamSubscription(teamId);
  if (!canAccessHistoricalSeason(subscription, historicalSeasonIndex)) {
    throw limitError();
  }
  return subscription;
}

export async function assertSocialTemplateAccess(
  teamId: string,
  templateIndex: number,
) {
  const subscription = await getTeamSubscription(teamId);
  if (!canUseSocialTemplate(subscription, templateIndex)) {
    throw limitError();
  }
  return subscription;
}
