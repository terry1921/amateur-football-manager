import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

type CookieSetter = (
  cookies: {
    name: string;
    value: string;
    options: { path: string; sameSite: "lax" };
  }[],
  headers: Record<string, string>,
) => void;

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { setAll: CookieSetter } },
  ) => ({
    auth: {
      getClaims: async () => {
        options.cookies.setAll(
          [
            {
              name: "sb-session",
              value: "refreshed-session",
              options: { path: "/", sameSite: "lax" },
            },
          ],
          { "Cache-Control": "private, no-store" },
        );

        return { data: null, error: null };
      },
    },
  }),
}));

import { updateSession } from "./proxy";

describe("Supabase session refresh", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes refreshed cookies to the request and response", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    const request = new NextRequest("https://matchday.test/en");
    const response = await updateSession(request, () => {
      expect(request.cookies.get("sb-session")?.value).toBe(
        "refreshed-session",
      );

      return NextResponse.next();
    });

    expect(response.cookies.get("sb-session")?.value).toBe("refreshed-session");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
