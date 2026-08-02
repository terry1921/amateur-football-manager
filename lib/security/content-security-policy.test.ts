import { describe, expect, it } from "vitest";
import { getContentSecurityPolicy } from "./content-security-policy";

describe("content security policy", () => {
  it("allows React development debugging eval only in development", () => {
    const policy = getContentSecurityPolicy("development");

    expect(policy).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
  });

  it("keeps unsafe-eval out of production CSP", () => {
    const policy = getContentSecurityPolicy("production");

    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });
});
