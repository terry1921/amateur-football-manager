"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { getTeamAccess } from "@/features/teams/access";
import type { AppLocale } from "@/i18n/routing";
import { mapBackendError } from "@/lib/errors/map-backend-error";
import { seasonInputFromFormData, seasonSchema } from "./schemas";
import type {
  SeasonField,
  SeasonFormActionState,
  SeasonLifecycleActionState,
} from "./state";

type DatabaseError = { code?: string };

function refreshSeasonViews(locale: AppLocale) {
  revalidatePath(`/${locale}/seasons`);
  revalidatePath(`/${locale}/dashboard`);
}

async function formValidationState(
  locale: AppLocale,
  error: z.ZodError,
): Promise<SeasonFormActionState> {
  const t = await getTranslations({ locale, namespace: "Seasons.validation" });
  const fieldErrors: Partial<Record<SeasonField, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field as SeasonField]) {
      fieldErrors[field as SeasonField] = t(issue.message);
    }
  }

  return { status: "error", fieldErrors };
}

async function databaseFormError(
  locale: AppLocale,
  error: DatabaseError,
): Promise<SeasonFormActionState> {
  const t = await getTranslations({ locale, namespace: "Seasons.errors" });
  const mapped = mapBackendError(error, "season");
  if (mapped.code === "RESULT_CONFLICT") {
    return {
      status: "error",
      fieldErrors: { name: t("duplicate") },
      errorCode: mapped.code,
    };
  }
  if (mapped.code === "SEASON_ALREADY_ACTIVE") {
    return {
      status: "error",
      message: t("cannotActivate"),
      errorCode: mapped.code,
    };
  }
  return {
    status: "error",
    message: t("unexpected"),
    errorCode: mapped.code,
    retryable: mapped.retryable,
  };
}

async function seasonActionContext(locale: AppLocale) {
  const context = await getTeamAccess();
  const user = context.user;
  const team = context.team;
  if (user && team) return { ...context, user, team };
  const t = await getTranslations({ locale, namespace: "Seasons.errors" });
  return {
    error: t("sessionExpired"),
    errorCode: "AUTH_SESSION_EXPIRED" as const,
  } as const;
}

export async function createSeasonAction(
  locale: AppLocale,
  _previousState: SeasonFormActionState,
  formData: FormData,
): Promise<SeasonFormActionState> {
  const parsed = seasonSchema.safeParse(seasonInputFromFormData(formData));
  if (!parsed.success) return formValidationState(locale, parsed.error);

  const context = await seasonActionContext(locale);
  if ("error" in context)
    return {
      status: "error",
      message: context.error,
      errorCode: context.errorCode,
    };

  const { error } = await context.supabase.from("seasons").insert({
    team_id: context.team.id,
    name: parsed.data.name,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    status: "draft",
  });

  if (error) return databaseFormError(locale, error);
  refreshSeasonViews(locale);
  redirect(`/${locale}/seasons`);
}

export async function updateSeasonAction(
  locale: AppLocale,
  seasonId: string,
  _previousState: SeasonFormActionState,
  formData: FormData,
): Promise<SeasonFormActionState> {
  const parsed = seasonSchema.safeParse(seasonInputFromFormData(formData));
  if (!parsed.success) return formValidationState(locale, parsed.error);

  const context = await seasonActionContext(locale);
  if ("error" in context)
    return {
      status: "error",
      message: context.error,
      errorCode: context.errorCode,
    };

  const { data: season, error: lookupError } = await context.supabase
    .from("seasons")
    .select("id, status")
    .eq("team_id", context.team.id)
    .eq("id", seasonId)
    .maybeSingle();
  const t = await getTranslations({ locale, namespace: "Seasons.errors" });

  if (lookupError) {
    const mapped = mapBackendError(lookupError, "season");
    return {
      status: "error",
      message: t("unexpected"),
      errorCode: mapped.code,
      retryable: mapped.retryable,
    };
  }
  if (!season)
    return {
      status: "error",
      message: t("notFound"),
      errorCode: "SEASON_NOT_FOUND",
    };
  if (season.status === "completed") {
    return {
      status: "error",
      message: t("historyProtected"),
      errorCode: "MATCH_HAS_HISTORY",
    };
  }

  const { count, error: matchError } = await context.supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("team_id", context.team.id)
    .eq("season_id", seasonId);

  if (matchError) {
    const mapped = mapBackendError(matchError, "season");
    return {
      status: "error",
      message: t("unexpected"),
      errorCode: mapped.code,
      retryable: mapped.retryable,
    };
  }
  if ((count ?? 0) > 0) {
    return { status: "error", message: t("hasMatches") };
  }

  const { error } = await context.supabase
    .from("seasons")
    .update({
      name: parsed.data.name,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
    })
    .eq("team_id", context.team.id)
    .eq("id", seasonId);

  if (error) return databaseFormError(locale, error);
  refreshSeasonViews(locale);
  redirect(`/${locale}/seasons`);
}

export async function activateSeasonAction(
  locale: AppLocale,
  seasonId: string,
  _previousState: SeasonLifecycleActionState,
): Promise<SeasonLifecycleActionState> {
  void _previousState;
  const context = await seasonActionContext(locale);
  if ("error" in context)
    return {
      status: "error",
      message: context.error,
      errorCode: context.errorCode,
    };

  const { error } = await context.supabase.rpc("activate_season", {
    target_season_id: seasonId,
  });
  const t = await getTranslations({ locale, namespace: "Seasons.errors" });

  if (error) {
    const mapped = mapBackendError(error, "season");
    return {
      status: "error",
      message:
        mapped.code === "SEASON_ALREADY_ACTIVE"
          ? t("cannotActivate")
          : t("notFound"),
      errorCode: mapped.code,
      retryable: mapped.retryable,
    };
  }

  refreshSeasonViews(locale);
  return { status: "success" };
}

export async function completeSeasonAction(
  locale: AppLocale,
  seasonId: string,
  _previousState: SeasonLifecycleActionState,
): Promise<SeasonLifecycleActionState> {
  void _previousState;
  const context = await seasonActionContext(locale);
  if ("error" in context)
    return {
      status: "error",
      message: context.error,
      errorCode: context.errorCode,
    };

  const { data, error } = await context.supabase
    .from("seasons")
    .update({ status: "completed" })
    .eq("team_id", context.team.id)
    .eq("id", seasonId)
    .in("status", ["draft", "active"])
    .select("id")
    .maybeSingle();
  const t = await getTranslations({ locale, namespace: "Seasons.errors" });

  if (error) {
    const mapped = mapBackendError(error, "season");
    return {
      status: "error",
      message: t("unexpected"),
      errorCode: mapped.code,
      retryable: mapped.retryable,
    };
  }
  if (!data)
    return {
      status: "error",
      message: t("notFound"),
      errorCode: "SEASON_NOT_FOUND",
    };

  refreshSeasonViews(locale);
  return { status: "success" };
}
