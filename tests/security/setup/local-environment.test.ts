import { describe, expect, it } from "vitest";
import {
  readSecurityTestEnvironment,
  securityEnvironmentFromSupabaseStatus,
} from "./local-environment.mjs";

const localEnvironment = {
  SUPABASE_TEST_URL: "http://127.0.0.1:54321",
  SUPABASE_TEST_PUBLISHABLE_KEY: "local-publishable-key",
  SUPABASE_TEST_SECRET_KEY: "local-secret-key",
};

describe("security test environment", () => {
  it("accepts an explicit loopback Supabase test target", () => {
    expect(readSecurityTestEnvironment(localEnvironment)).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "local-publishable-key",
      secretKey: "local-secret-key",
    });
  });

  it.each([
    "https://project-ref.supabase.co",
    "http://database.internal:54321",
    "http://0.0.0.0:54321",
  ])("refuses the non-loopback target %s", (url) => {
    expect(() =>
      readSecurityTestEnvironment({
        ...localEnvironment,
        SUPABASE_TEST_URL: url,
      }),
    ).toThrow("Security tests may only target local Supabase");
  });

  it("refuses to run without dedicated test credentials", () => {
    expect(() =>
      readSecurityTestEnvironment({
        SUPABASE_TEST_URL: localEnvironment.SUPABASE_TEST_URL,
      }),
    ).toThrow(
      "Missing security test environment variables: SUPABASE_TEST_PUBLISHABLE_KEY, SUPABASE_TEST_SECRET_KEY",
    );
  });

  it("maps captured local CLI status without exposing unrelated values", () => {
    expect(
      securityEnvironmentFromSupabaseStatus(`API_URL="http://127.0.0.1:54321"
PUBLISHABLE_KEY="local-publishable-key"
SECRET_KEY="local-secret-key"
DB_URL="ignored-local-value"`),
    ).toEqual({
      SUPABASE_TEST_URL: "http://127.0.0.1:54321",
      SUPABASE_TEST_PUBLISHABLE_KEY: "local-publishable-key",
      SUPABASE_TEST_SECRET_KEY: "local-secret-key",
    });
  });
});
