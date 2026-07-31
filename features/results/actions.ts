"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { z } from "zod";
import { isMatchId, type MatchLocation } from "@/features/matches/model";
import { getTeamAccess } from "@/features/teams/access";
import type { AppLocale } from "@/i18n/routing";
import {
  orientResultScore,
  type ResultEventInput,
  type ResultScore,
} from "./model";
import {
  resultInputFromFormData,
  resultSubmissionSchema,
  type ResultSubmission,
} from "./schemas";
import type { ResultActionState } from "./state";

type DatabaseError = { code?: string; message?: string };

type MatchCompletion = {
  match_id: string;
  status: "completed";
  team_score: number;
  opponent_score: number;
  event_count: number;
};

export type ResultMutationClient = {
  rpc: (
    name: "complete_match_with_events",
    args: {
      target_match_id: string;
      final_team_score: number;
      final_opponent_score: number;
      event_rows: Array<{
        type: ResultEventInput["type"];
        player_id: string;
        minute: number;
        stoppage_time?: number;
        notes?: string;
      }>;
    },
  ) => PromiseLike<{
    data: MatchCompletion | null;
    error: DatabaseError | null;
  }>;
};

export async function completeOwnedMatch(
  client: ResultMutationClient,
  matchId: string,
  score: Pick<ResultScore, "teamScore" | "opponentScore">,
  events: ResultEventInput[],
) {
  // The RPC is the transaction boundary. It locks the scheduled match,
  // replaces the normalized event set, reconciles goals, and completes the
  // match before committing or rolling back the whole operation.
  const result = await client.rpc("complete_match_with_events", {
    target_match_id: matchId,
    final_team_score: score.teamScore,
    final_opponent_score: score.opponentScore,
    event_rows: events.map(
      ({ type, playerId, minute, stoppageTime, notes }) => ({
        type,
        player_id: playerId,
        minute,
        stoppage_time: stoppageTime ?? 0,
        notes: notes ?? "",
      }),
    ),
  });

  if (result.error) throw result.error;
  return result.data;
}

async function validationState(
  locale: AppLocale,
  error: z.ZodError,
): Promise<ResultActionState> {
  const t = await getTranslations({ locale, namespace: "Results.validation" });
  const fieldErrors: ResultActionState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      !fieldErrors[field as keyof typeof fieldErrors]
    ) {
      const messageKey = [
        "required",
        "integer",
        "tooLarge",
        "requiredEvents",
        "invalidEvents",
        "invalidType",
        "invalidPlayer",
        "nonNegative",
        "notesTooLong",
        "tooMany",
      ].includes(issue.message)
        ? issue.message
        : field === "events"
          ? "invalidEvents"
          : "integer";
      fieldErrors[field as keyof typeof fieldErrors] = t(messageKey);
    }
  }
  return { status: "error", fieldErrors };
}

async function resultError(
  locale: AppLocale,
  key:
    | "sessionExpired"
    | "notFound"
    | "cancelled"
    | "completed"
    | "goalMismatch"
    | "notInCallup"
    | "invalidEvents"
    | "migrationMissing"
    | "unexpected",
): Promise<ResultActionState> {
  const t = await getTranslations({ locale, namespace: "Results.errors" });
  return { status: "error", message: t(key) };
}

function refreshResultViews(locale: AppLocale, matchId: string) {
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/matches`);
  revalidatePath(`/${locale}/matches/${matchId}`);
  revalidatePath(`/${locale}/matches/${matchId}/result`);
  revalidatePath(`/${locale}/seasons`);
}

function mutationErrorKey(error: DatabaseError) {
  if (error.code === "PGRST202" || error.code === "42883") {
    return "migrationMissing" as const;
  }
  if (error.code === "23503") return "notInCallup" as const;
  if (error.code === "55000") return "completed" as const;
  if (error.code === "22023") {
    if (error.message?.includes("goal_count_mismatch")) {
      return "goalMismatch" as const;
    }
    if (
      error.message?.includes("event_player") ||
      error.message?.includes("callup")
    ) {
      return "notInCallup" as const;
    }
    return "invalidEvents" as const;
  }
  if (["22P02", "23502", "23514", "22001"].includes(error.code ?? "")) {
    return "invalidEvents" as const;
  }
  if (error.code === "P0002" || error.code === "42501") {
    return "notFound" as const;
  }
  return "unexpected" as const;
}

export async function completeMatchAction(
  locale: AppLocale,
  matchId: string,
  _previousState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  void _previousState;
  if (!isMatchId(matchId)) return resultError(locale, "notFound");

  const parsed = resultSubmissionSchema.safeParse(
    resultInputFromFormData(formData),
  );
  if (!parsed.success) return validationState(locale, parsed.error);

  const context = await getTeamAccess();
  if (!context.user || !context.team) {
    return resultError(locale, "sessionExpired");
  }

  const lookup = await context.supabase
    .from("matches")
    .select("id, status, home_away")
    .eq("team_id", context.team.id)
    .eq("id", matchId)
    .maybeSingle();

  if (lookup.error) return resultError(locale, "unexpected");
  if (!lookup.data) return resultError(locale, "notFound");
  if (lookup.data.status === "cancelled") {
    return resultError(locale, "cancelled");
  }
  if (lookup.data.status === "completed") {
    return resultError(locale, "completed");
  }

  const score = orientResultScore(
    parsed.data,
    lookup.data.home_away as MatchLocation,
  );

  try {
    const completion = await completeOwnedMatch(
      context.supabase as unknown as ResultMutationClient,
      matchId,
      score,
      parsed.data.events as ResultSubmission["events"],
    );
    if (!completion) return resultError(locale, "completed");
  } catch (error) {
    return resultError(locale, mutationErrorKey(error as DatabaseError));
  }

  refreshResultViews(locale, matchId);
  redirect(`/${locale}/matches/${matchId}?notice=result-recorded`);
}
