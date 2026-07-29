import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

export function isAppLocale(value: string): value is AppLocale {
  return routing.locales.includes(value as AppLocale);
}

export function safeInternalPath(
  value: string | null | undefined,
  fallback: string,
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://matchday.invalid");

    if (parsed.origin !== "https://matchday.invalid") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function getAppUrl(pathname: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const origin = configuredUrl
    ? configuredUrl
    : vercelUrl
      ? `https://${vercelUrl}`
      : "http://localhost:3000";

  return new URL(pathname, `${origin.replace(/\/$/, "")}/`).toString();
}
