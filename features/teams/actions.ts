"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { z } from "zod";
import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import {
  createTeamSchema,
  teamInputFromFormData,
  type CreateTeamInput,
} from "./schemas";
import { slugCandidate, slugifyTeamName } from "./slug";
import type { CreateTeamActionState, TeamField } from "./state";

const MAX_SLUG_ATTEMPTS = 100;

type TeamInsertClient = {
  from: (table: "teams") => {
    insert: (values: {
      owner_id: string;
      name: string;
      short_name: string | null;
      city: string | null;
      country: string | null;
      primary_color: string | null;
      secondary_color: string | null;
      slug: string;
    }) => PromiseLike<{ error: { code?: string } | null }>;
  };
};

export async function insertTeamWithUniqueSlug(
  supabase: TeamInsertClient,
  ownerId: string,
  input: CreateTeamInput,
) {
  const baseSlug = slugifyTeamName(input.name);

  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const { error } = await supabase.from("teams").insert({
      owner_id: ownerId,
      name: input.name,
      short_name: input.shortName,
      city: input.city,
      country: input.country,
      primary_color: input.primaryColor,
      secondary_color: input.secondaryColor,
      slug: slugCandidate(baseSlug, attempt),
    });

    if (!error) return;
    if (error.code !== "23505") throw error;
  }

  throw new Error("slug_attempts_exhausted");
}

async function validationState(
  locale: AppLocale,
  error: z.ZodError,
): Promise<CreateTeamActionState> {
  const t = await getTranslations({
    locale,
    namespace: "Onboarding.validation",
  });
  const fieldErrors: Partial<Record<TeamField, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !fieldErrors[field as TeamField]) {
      fieldErrors[field as TeamField] = t(issue.message);
    }
  }

  return { status: "error", fieldErrors };
}

export async function createTeamAction(
  locale: AppLocale,
  _previousState: CreateTeamActionState,
  formData: FormData,
): Promise<CreateTeamActionState> {
  const result = createTeamSchema.safeParse(teamInputFromFormData(formData));
  if (!result.success) return validationState(locale, result.error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations({ locale, namespace: "Onboarding.errors" });

  if (!user) return { status: "error", message: t("sessionExpired") };

  const { data: existingTeam, error: lookupError } = await supabase
    .from("teams")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (lookupError) return { status: "error", message: t("unexpected") };
  if (existingTeam) redirect(`/${locale}/dashboard`);

  try {
    await insertTeamWithUniqueSlug(supabase, user.id, result.data);
  } catch {
    return { status: "error", message: t("unexpected") };
  }

  redirect(`/${locale}/dashboard`);
}
