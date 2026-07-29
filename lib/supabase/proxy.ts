import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabasePublicConfig } from "./env";

type ResponseFactory = () => NextResponse | Promise<NextResponse>;

export async function updateSession(
  request: NextRequest,
  createResponse: ResponseFactory = () => NextResponse.next({ request }),
) {
  const { url, publishableKey } = getSupabasePublicConfig();
  const pendingCookies: Parameters<NextResponse["cookies"]["set"]>[] = [];
  const pendingHeaders = new Headers();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          pendingCookies.push([name, value, options]);
        });

        Object.entries(headers).forEach(([name, value]) => {
          pendingHeaders.set(name, value);
        });
      },
    },
  });

  // This validates and refreshes the cookie-backed session when necessary.
  // Authorization belongs in page/action code and RLS policies, not here.
  await supabase.auth.getClaims();

  const response = await createResponse();

  pendingCookies.forEach((cookie) => response.cookies.set(...cookie));
  pendingHeaders.forEach((value, name) => response.headers.set(name, value));

  return response;
}
