import { describe, expect, it } from "vitest";
import { getSupabasePublicConfig } from "./env";

describe("Supabase public environment", () => {
  it("returns normalized public configuration", () => {
    expect(
      getSupabasePublicConfig({
        url: "https://example.supabase.co/",
        publishableKey: "sb_publishable_test",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("reports every missing variable", () => {
    expect(() => getSupabasePublicConfig({})).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("rejects invalid project URLs", () => {
    expect(() =>
      getSupabasePublicConfig({
        url: "not-a-url",
        publishableKey: "sb_publishable_test",
      }),
    ).toThrow("must be a valid http(s) URL");
  });
});
