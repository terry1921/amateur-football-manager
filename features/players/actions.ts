"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { z } from "zod";
import { getTeamAccess } from "@/features/teams/access";
import { mapBackendError } from "@/lib/errors/map-backend-error";
import type { AppLocale } from "@/i18n/routing";
import type { PlayerStatus } from "./model";
import { playerInputFromFormData, playerSchema } from "./schemas";
import type {
  PlayerField,
  PlayerFormActionState,
  PlayerLifecycleActionState,
} from "./state";

function refreshPlayerViews(locale: AppLocale) {
  revalidatePath(`/${locale}/players`);
  revalidatePath(`/${locale}/dashboard`);
}

async function playerActionContext(locale: AppLocale) {
  const context = await getTeamAccess();
  if (context.user && context.team) {
    return { ...context, user: context.user, team: context.team };
  }
  const t = await getTranslations({ locale, namespace: "Players.errors" });
  return { error: t("sessionExpired") } as const;
}

async function validationState(
  locale: AppLocale,
  error: z.ZodError,
): Promise<PlayerFormActionState> {
  const t = await getTranslations({ locale, namespace: "Players.validation" });
  const fieldErrors: Partial<Record<PlayerField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field as PlayerField]) {
      fieldErrors[field as PlayerField] = t(issue.message);
    }
  }
  return { status: "error", fieldErrors };
}

async function unexpectedFormError(
  locale: AppLocale,
  error?: unknown,
): Promise<PlayerFormActionState> {
  const t = await getTranslations({ locale, namespace: "Players.errors" });
  const mapped = error
    ? mapBackendError(error, "player")
    : { code: "UNEXPECTED_ERROR" as const, retryable: true };
  if (mapped.code === "DUPLICATE_SHIRT_NUMBER") {
    return {
      status: "error",
      message: t("duplicateShirtNumber"),
      errorCode: mapped.code,
      fieldErrors: { shirtNumber: t("duplicateShirtNumber") },
    };
  }
  return {
    status: "error",
    message:
      mapped.code === "PLAYER_NOT_FOUND" ? t("notFound") : t("unexpected"),
    errorCode: mapped.code,
    retryable: mapped.retryable,
  };
}

function toRow(data: z.infer<typeof playerSchema>) {
  return {
    first_name: data.firstName,
    last_name: data.lastName,
    nickname: data.nickname,
    shirt_number: data.shirtNumber,
    position: data.position,
    status: data.status,
  };
}

export async function createPlayerAction(
  locale: AppLocale,
  _previousState: PlayerFormActionState,
  formData: FormData,
): Promise<PlayerFormActionState> {
  const parsed = playerSchema.safeParse(playerInputFromFormData(formData));
  if (!parsed.success) return validationState(locale, parsed.error);
  const context = await playerActionContext(locale);
  if ("error" in context) return { status: "error", message: context.error };

  const { error } = await context.supabase.from("players").insert({
    team_id: context.team.id,
    ...toRow(parsed.data),
  });
  if (error) return unexpectedFormError(locale, error);
  refreshPlayerViews(locale);
  redirect(`/${locale}/players?notice=created`);
}

export async function updatePlayerAction(
  locale: AppLocale,
  playerId: string,
  _previousState: PlayerFormActionState,
  formData: FormData,
): Promise<PlayerFormActionState> {
  const parsed = playerSchema.safeParse(playerInputFromFormData(formData));
  if (!parsed.success) return validationState(locale, parsed.error);
  const context = await playerActionContext(locale);
  if ("error" in context) return { status: "error", message: context.error };

  const { data, error } = await context.supabase
    .from("players")
    .update(toRow(parsed.data))
    .eq("team_id", context.team.id)
    .eq("id", playerId)
    .select("id")
    .maybeSingle();
  const t = await getTranslations({ locale, namespace: "Players.errors" });
  if (error) return unexpectedFormError(locale, error);
  if (!data)
    return {
      status: "error",
      message: t("notFound"),
      errorCode: "PLAYER_NOT_FOUND",
    };
  refreshPlayerViews(locale);
  redirect(`/${locale}/players?notice=updated`);
}

export async function changePlayerStatusAction(
  locale: AppLocale,
  playerId: string,
  status: PlayerStatus,
  _previousState: PlayerLifecycleActionState,
): Promise<PlayerLifecycleActionState> {
  void _previousState;
  const context = await playerActionContext(locale);
  if ("error" in context) return { status: "error", message: context.error };

  const { data, error } = await context.supabase
    .from("players")
    .update({ status })
    .eq("team_id", context.team.id)
    .eq("id", playerId)
    .select("id")
    .maybeSingle();
  const t = await getTranslations({ locale, namespace: "Players.errors" });
  if (error) {
    const mapped = mapBackendError(error, "player");
    return {
      status: "error",
      message:
        mapped.code === "PLAYER_NOT_FOUND" ? t("notFound") : t("unexpected"),
      errorCode: mapped.code,
      retryable: mapped.retryable,
    };
  }
  if (!data)
    return {
      status: "error",
      message: t("notFound"),
      errorCode: "PLAYER_NOT_FOUND",
    };
  refreshPlayerViews(locale);
  redirect(
    `/${locale}/players?notice=${status === "inactive" ? "deactivated" : "reactivated"}`,
  );
}
