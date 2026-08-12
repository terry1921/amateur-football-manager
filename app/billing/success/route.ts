import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { getAppUrl } from "@/lib/auth/urls";

// The provider webhook, not this redirect, is the only source of subscription activation.
export function GET() {
  return NextResponse.redirect(
    getAppUrl(`/${routing.defaultLocale}/pricing?checkout=success`),
  );
}
