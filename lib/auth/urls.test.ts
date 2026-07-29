import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppUrl, safeInternalPath } from "./urls";

describe("authentication URL safety", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(["/dashboard", "/players", "/es/matches?view=upcoming"])(
    "allows internal path %s",
    (path) => expect(safeInternalPath(path, "/fallback")).toBe(path),
  );

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
  ])("rejects external or ambiguous path %s", (path) => {
    expect(safeInternalPath(path, "/fallback")).toBe("/fallback");
  });

  it("uses the configured application origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://matchday.example/");
    expect(getAppUrl("/en/auth/callback")).toBe(
      "https://matchday.example/en/auth/callback",
    );
  });
});
