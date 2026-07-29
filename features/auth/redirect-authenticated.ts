import { redirect } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export async function redirectAuthenticated(locale: AppLocale) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(`/${locale}/dashboard`);
}
