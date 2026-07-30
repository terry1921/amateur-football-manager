import { describe, expect, it } from "vitest";
import { accessRedirect } from "./access";

describe("authenticated application routing", () => {
  it("sends unauthenticated application visitors to login", () => {
    expect(
      accessRedirect({
        area: "application",
        authenticated: false,
        hasTeam: false,
        locale: "en",
      }),
    ).toBe("/en/login");
  });

  it("sends authenticated users without a team to onboarding", () => {
    expect(
      accessRedirect({
        area: "application",
        authenticated: true,
        hasTeam: false,
        locale: "en",
      }),
    ).toBe("/en/onboarding");
  });

  it("keeps authenticated team owners in the application", () => {
    expect(
      accessRedirect({
        area: "application",
        authenticated: true,
        hasTeam: true,
        locale: "en",
      }),
    ).toBeNull();
  });

  it("prevents an existing team owner from seeing onboarding again", () => {
    expect(
      accessRedirect({
        area: "onboarding",
        authenticated: true,
        hasTeam: true,
        locale: "es",
      }),
    ).toBe("/es/dashboard");
  });

  it("routes signed-in auth-page visitors according to ownership", () => {
    expect(
      accessRedirect({
        area: "auth",
        authenticated: true,
        hasTeam: false,
        locale: "en",
      }),
    ).toBe("/en/onboarding");
    expect(
      accessRedirect({
        area: "auth",
        authenticated: true,
        hasTeam: true,
        locale: "en",
      }),
    ).toBe("/en/dashboard");
  });
});
