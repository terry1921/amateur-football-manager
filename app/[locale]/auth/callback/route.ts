import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { isAppLocale, safeInternalPath } from "@/lib/auth/urls";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: localeInput } = await params;
  const locale = isAppLocale(localeInput) ? localeInput : routing.defaultLocale;
  const code = request.nextUrl.searchParams.get("code");
  const next = safeInternalPath(
    request.nextUrl.searchParams.get("next"),
    `/${locale}/dashboard`,
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(
    new URL(`/${locale}/login?error=callback`, request.url),
  );
}
