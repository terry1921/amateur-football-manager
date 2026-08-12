import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { getAppUrl } from "@/lib/auth/urls";

export function GET() {
  return NextResponse.redirect(
    getAppUrl(`/${routing.defaultLocale}/pricing?checkout=canceled`),
  );
}
