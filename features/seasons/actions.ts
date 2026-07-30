"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { getTeamAccess } from "@/features/teams/access";
import type { AppLocale } from "@/i18n/routing";
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
  if (error.code === "23505") {
    return { status: "error", fieldErrors: { name: t("duplicate") } };
  }
  if (error.code === "55000") {
    return { status: "error", message: t("historyProtected") };
  }
  return { status: "error", message: t("unexpected") };
}

async function seasonActionContext(locale: AppLocale) {
  const context = await getTeamAccess();
  const user = context.user;
  const team = context.team;
  if (user && team) return { ...context, user, team };
  const t = await getTranslations({ locale, namespace: "Seasons.errors" });
  return { error: t("sessionExpired") } as const;
}

export async function createSeasonAction(
  locale: AppLocale,
  _previousState: SeasonFormActionState,
  formData: FormData,
): Promise<SeasonFormActionState> {
  const parsed = seasonSchema.safeParse(seasonInputFromFormData(formData));
  if (!parsed.success) return formValidationState(locale, parsed.error);

  const context = await seasonActionContext(locale);
  if ("error" in context) return { status: "error", message: context.error };

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
  if ("error" in context) return { status: "error", message: context.error };

  const { data: season, error: lookupError } = await context.supabase
    .from("seasons")
    .select("id, status")
    .eq("team_id", context.team.id)
    .eq("id", seasonId)
    .maybeSingle();
  const t = await getTranslations({ locale, namespace: "Seasons.errors" });

  if (lookupError) return { status: "error", message: t("unexpected") };
  if (!season) return { status: "error", message: t("notFound") };
  if (season.status === "completed") {
    return { status: "error", message: t("historyProtected") };
  }

  const { count, error: matchError } = await context.supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("team_id", context.team.id)
    .eq("season_id", seasonId);

  if (matchError) return { status: "error", message: t("unexpected") };
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
  if ("error" in context) return { status: "error", message: context.error };

  const { error } = await context.supabase.rpc("activate_season", {
    target_season_id: seasonId,
  });
  const t = await getTranslations({ locale, namespace: "Seasons.errors" });

  if (error) {
    return {
      status: "error",
      message: error.code === "22023" ? t("cannotActivate") : t("notFound"),
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
  if ("error" in context) return { status: "error", message: context.error };

  const { data, error } = await context.supabase
    .from("seasons")
    .update({ status: "completed" })
    .eq("team_id", context.team.id)
    .eq("id", seasonId)
    .in("status", ["draft", "active"])
    .select("id")
    .maybeSingle();
  const t = await getTranslations({ locale, namespace: "Seasons.errors" });

  if (error) return { status: "error", message: t("unexpected") };
  if (!data) return { status: "error", message: t("notFound") };

  refreshSeasonViews(locale);
  return { status: "success" };
}
