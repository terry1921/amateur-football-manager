import { cache } from "react";
import { redirect } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export type AccessArea = "auth" | "onboarding" | "application";

export function accessRedirect({
  area,
  authenticated,
  hasTeam,
  locale,
}: {
  area: AccessArea;
  authenticated: boolean;
  hasTeam: boolean;
  locale: AppLocale;
}) {
  if (!authenticated) {
    return area === "auth" ? null : `/${locale}/login`;
  }

  if (area === "auth") {
    return `/${locale}/${hasTeam ? "dashboard" : "onboarding"}`;
  }

  if (area === "onboarding") {
    return hasTeam ? `/${locale}/dashboard` : null;
  }

  return hasTeam ? null : `/${locale}/onboarding`;
}

export const getTeamAccess = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, team: null };

  const { data: team, error } = await supabase
    .from("teams")
    .select(
      "id, name, short_name, city, country, primary_color, secondary_color",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return { supabase, user, team };
});

export async function enforceAccess(area: AccessArea, locale: AppLocale) {
  const context = await getTeamAccess();
  const destination = accessRedirect({
    area,
    authenticated: Boolean(context.user),
    hasTeam: Boolean(context.team),
    locale,
  });

  if (destination) redirect(destination);
  return context;
}
