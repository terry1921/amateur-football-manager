import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./schemas";

describe("authentication schemas", () => {
  it("accepts a valid login and normalizes the email", () => {
    expect(
      loginSchema.parse({ email: "  COACH@Example.COM ", password: "secret" }),
    ).toEqual({ email: "coach@example.com", password: "secret" });
  });

  it("rejects an invalid login email and missing password", () => {
    const result = loginSchema.safeParse({ email: "coach", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(
        "invalidEmail",
      );
      expect(result.error.flatten().fieldErrors.password).toContain("required");
    }
  });

  it("accepts valid registration", () => {
    expect(
      registerSchema.safeParse({
        email: "coach@example.com",
        password: "matchday8",
        confirmPassword: "matchday8",
      }).success,
    ).toBe(true);
  });

  it("rejects a weak registration password", () => {
    const result = registerSchema.safeParse({
      email: "coach@example.com",
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        "weakPassword",
      );
    }
  });

  it("rejects mismatched registration passwords", () => {
    const result = registerSchema.safeParse({
      email: "coach@example.com",
      password: "matchday8",
      confirmPassword: "different8",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        "passwordMismatch",
      );
    }
  });

  it("validates forgot-password email", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "coach@example.com" }).success,
    ).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "invalid" }).success).toBe(
      false,
    );
  });

  it("validates reset-password confirmation", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "matchday8",
        confirmPassword: "matchday8",
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        password: "matchday8",
        confirmPassword: "different8",
      }).success,
    ).toBe(false);
  });
});
