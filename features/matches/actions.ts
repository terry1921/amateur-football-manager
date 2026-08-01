"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { z } from "zod";
import { getTeamAccess } from "@/features/teams/access";
import type { AppLocale } from "@/i18n/routing";
import { mapBackendError } from "@/lib/errors/map-backend-error";
import type { MatchInput } from "./schemas";
import { matchInputFromFormData, matchSchema } from "./schemas";
import type {
  MatchField,
  MatchFormActionState,
  MatchLifecycleActionState,
} from "./state";
import { wallTimeToUtc } from "./time";

type DatabaseError = { code?: string; message?: string };
type QueryResult<T> = PromiseLike<{
  data: T | null;
  error: DatabaseError | null;
}>;

type MatchMutationQuery = {
  select: (columns: string) => MatchMutationQuery;
  eq: (field: string, value: string) => MatchMutationQuery;
  in: (field: string, values: string[]) => MatchMutationQuery;
  maybeSingle: () => QueryResult<Record<string, unknown>>;
  insert: (
    values: Record<string, unknown>,
  ) => PromiseLike<{ error: DatabaseError | null }>;
};

export type MatchMutationClient = {
  from: (table: string) => MatchMutationQuery;
};

function refreshMatchViews(locale: AppLocale, matchId?: string) {
  revalidatePath(`/${locale}/matches`);
  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/seasons`);
  if (matchId) revalidatePath(`/${locale}/matches/${matchId}`);
}

async function matchActionContext(locale: AppLocale) {
  const context = await getTeamAccess();
  if (context.user && context.team) {
    return { ...context, user: context.user, team: context.team };
  }
  const t = await getTranslations({ locale, namespace: "Matches.errors" });
  return {
    error: t("sessionExpired"),
    errorCode: "AUTH_SESSION_EXPIRED" as const,
  } as const;
}

async function validationState(
  locale: AppLocale,
  error: z.ZodError,
): Promise<MatchFormActionState> {
  const t = await getTranslations({ locale, namespace: "Matches.validation" });
  const fieldErrors: Partial<Record<MatchField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field as MatchField]) {
      fieldErrors[field as MatchField] = t(issue.message);
    }
  }
  return { status: "error", fieldErrors };
}

async function unexpectedFormError(
  locale: AppLocale,
  error?: unknown,
): Promise<MatchFormActionState> {
  const t = await getTranslations({ locale, namespace: "Matches.errors" });
  const mapped = error
    ? mapBackendError(error, "match")
    : { code: "UNEXPECTED_ERROR" as const, retryable: true };
  const key = mapped.code === "MATCH_NOT_FOUND" ? "notFound" : "unexpected";
  return {
    status: "error",
    message: t(key),
    errorCode: mapped.code,
    retryable: mapped.retryable,
  };
}

export async function verifyOwnedEligibleSeason(
  client: MatchMutationClient,
  teamId: string,
  seasonId: string,
) {
  const result = await client
    .from("seasons")
    .select("id")
    .eq("team_id", teamId)
    .eq("id", seasonId)
    .in("status", ["draft", "active"])
    .maybeSingle();
  if (result.error) throw result.error;
  return Boolean(result.data);
}

export async function insertScheduledMatch(
  client: MatchMutationClient,
  teamId: string,
  input: MatchInput,
  kickoffAt: string,
  creationKey?: string,
) {
  const row: Record<string, unknown> = {
    team_id: teamId,
    season_id: input.seasonId,
    opponent_name: input.opponentName,
    kickoff_at: kickoffAt,
    home_away: input.location,
    venue: input.venue,
    notes: input.notes,
    status: "scheduled",
    team_score: null,
    opponent_score: null,
  };
  if (creationKey) row.creation_key = creationKey;
  const result = await client.from("matches").insert(row);
  if (result.error) throw result.error;
}

function matchUpdateRow(input: MatchInput, kickoffAt: string) {
  return {
    season_id: input.seasonId,
    opponent_name: input.opponentName,
    kickoff_at: kickoffAt,
    home_away: input.location,
    venue: input.venue,
    notes: input.notes,
  };
}

type ParsedMatchForm =
  | { success: true; input: MatchInput; kickoffAt: string }
  | { success: false; state: MatchFormActionState };

async function parseMatchForm(
  locale: AppLocale,
  formData: FormData,
): Promise<ParsedMatchForm> {
  const parsed = matchSchema.safeParse(matchInputFromFormData(formData));
  if (!parsed.success) {
    return {
      success: false,
      state: await validationState(locale, parsed.error),
    };
  }
  const kickoffAt = wallTimeToUtc(parsed.data);
  if (!kickoffAt) {
    const t = await getTranslations({
      locale,
      namespace: "Matches.validation",
    });
    return {
      success: false,
      state: {
        status: "error",
        fieldErrors: { time: t("invalidLocalTime") },
      } satisfies MatchFormActionState,
    };
  }
  return { success: true, input: parsed.data, kickoffAt };
}

export async function createMatchAction(
  locale: AppLocale,
  _previousState: MatchFormActionState,
  formData: FormData,
): Promise<MatchFormActionState> {
  const parsed = await parseMatchForm(locale, formData);
  if (!parsed.success) return parsed.state;
  const context = await matchActionContext(locale);
  if ("error" in context) return { status: "error", message: context.error };

  try {
    const client = context.supabase as unknown as MatchMutationClient;
    const eligible = await verifyOwnedEligibleSeason(
      client,
      context.team.id,
      parsed.input.seasonId,
    );
    if (!eligible) {
      const t = await getTranslations({
        locale,
        namespace: "Matches.validation",
      });
      return {
        status: "error",
        fieldErrors: { seasonId: t("ineligibleSeason") },
      };
    }
    const creationKey = formData.get("creationKey")?.toString() ?? "";
    await insertScheduledMatch(
      client,
      context.team.id,
      parsed.input,
      parsed.kickoffAt,
      /^[0-9a-f-]{36}$/i.test(creationKey) ? creationKey : undefined,
    );
  } catch (error) {
    const mapped = mapBackendError(error, "match");
    if (mapped.code === "MATCH_DUPLICATE_SUBMISSION") {
      // The first request may have committed while its response was lost.
      // The unique key makes this retry safe, so do not ask the user to submit
      // again or create another fixture.
      refreshMatchViews(locale);
      redirect(`/${locale}/matches?notice=created`);
    }
    return unexpectedFormError(locale, error);
  }

  refreshMatchViews(locale);
  redirect(`/${locale}/matches?notice=created`);
}

export async function updateMatchAction(
  locale: AppLocale,
  matchId: string,
  _previousState: MatchFormActionState,
  formData: FormData,
): Promise<MatchFormActionState> {
  const parsed = await parseMatchForm(locale, formData);
  if (!parsed.success) return parsed.state;
  const context = await matchActionContext(locale);
  if ("error" in context) return { status: "error", message: context.error };
  const t = await getTranslations({ locale, namespace: "Matches.errors" });

  try {
    const eligible = await verifyOwnedEligibleSeason(
      context.supabase as unknown as MatchMutationClient,
      context.team.id,
      parsed.input.seasonId,
    );
    if (!eligible) {
      const validation = await getTranslations({
        locale,
        namespace: "Matches.validation",
      });
      return {
        status: "error",
        fieldErrors: { seasonId: validation("ineligibleSeason") },
      };
    }

    const lookup = await context.supabase
      .from("matches")
      .select("id, status")
      .eq("team_id", context.team.id)
      .eq("id", matchId)
      .maybeSingle();
    if (lookup.error) return unexpectedFormError(locale, lookup.error);
    if (!lookup.data)
      return {
        status: "error",
        message: t("notFound"),
        errorCode: "MATCH_NOT_FOUND",
      };
    if (lookup.data.status !== "scheduled") {
      return {
        status: "error",
        message: t("historyProtected"),
        errorCode: "MATCH_HAS_HISTORY",
      };
    }

    const update = await context.supabase
      .from("matches")
      .update(matchUpdateRow(parsed.input, parsed.kickoffAt))
      .eq("team_id", context.team.id)
      .eq("id", matchId)
      .eq("status", "scheduled")
      .select("id")
      .maybeSingle();
    if (update.error) return unexpectedFormError(locale, update.error);
    if (!update.data)
      return {
        status: "error",
        message: t("notFound"),
        errorCode: "MATCH_NOT_FOUND",
      };
  } catch (error) {
    return unexpectedFormError(locale, error);
  }

  refreshMatchViews(locale, matchId);
  redirect(`/${locale}/matches/${matchId}?notice=updated`);
}

export async function cancelMatchAction(
  locale: AppLocale,
  matchId: string,
  _previousState: MatchLifecycleActionState,
): Promise<MatchLifecycleActionState> {
  void _previousState;
  const context = await matchActionContext(locale);
  if ("error" in context) return { status: "error", message: context.error };
  const t = await getTranslations({ locale, namespace: "Matches.errors" });
  const result = await context.supabase
    .from("matches")
    .update({
      status: "cancelled",
      team_score: null,
      opponent_score: null,
    })
    .eq("team_id", context.team.id)
    .eq("id", matchId)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();

  if (result.error) return unexpectedFormError(locale, result.error);
  if (!result.data)
    return {
      status: "error",
      message: t("notFound"),
      errorCode: "MATCH_NOT_FOUND",
    };
  refreshMatchViews(locale, matchId);
  redirect(`/${locale}/matches/${matchId}?notice=cancelled`);
}

export async function deleteMatchAction(
  locale: AppLocale,
  matchId: string,
  _previousState: MatchLifecycleActionState,
): Promise<MatchLifecycleActionState> {
  void _previousState;
  const context = await matchActionContext(locale);
  if ("error" in context) return { status: "error", message: context.error };
  const t = await getTranslations({ locale, namespace: "Matches.errors" });

  const [match, callups, events] = await Promise.all([
    context.supabase
      .from("matches")
      .select("id, status")
      .eq("team_id", context.team.id)
      .eq("id", matchId)
      .maybeSingle(),
    context.supabase
      .from("callups")
      .select("id", { count: "exact", head: true })
      .eq("match_id", matchId),
    context.supabase
      .from("match_events")
      .select("id", { count: "exact", head: true })
      .eq("match_id", matchId),
  ]);
  if (match.error || callups.error || events.error) {
    return unexpectedFormError(
      locale,
      match.error ?? callups.error ?? events.error,
    );
  }
  if (!match.data)
    return {
      status: "error",
      message: t("notFound"),
      errorCode: "MATCH_NOT_FOUND",
    };
  if (
    match.data.status === "completed" ||
    (callups.count ?? 0) > 0 ||
    (events.count ?? 0) > 0
  ) {
    return { status: "error", message: t("deleteRestricted") };
  }

  const result = await context.supabase
    .from("matches")
    .delete()
    .eq("team_id", context.team.id)
    .eq("id", matchId)
    .in("status", ["scheduled", "cancelled"])
    .select("id")
    .maybeSingle();
  if (result.error) return unexpectedFormError(locale, result.error);
  if (!result.data)
    return {
      status: "error",
      message: t("notFound"),
      errorCode: "MATCH_NOT_FOUND",
    };

  refreshMatchViews(locale, matchId);
  redirect(`/${locale}/matches?notice=deleted`);
}
