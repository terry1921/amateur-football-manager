import { describe, expect, it } from "vitest";
import { mapAuthError, mapBackendError } from "./map-backend-error";

describe("application error mapping", () => {
  it("maps constraint and state errors without depending on raw UI strings", () => {
    expect(
      mapBackendError(
        { code: "23505", message: "duplicate key shirt_number" },
        "player",
      ),
    ).toMatchObject({ code: "DUPLICATE_SHIRT_NUMBER", category: "conflict" });
    expect(mapBackendError({ code: "55000" }, "result")).toMatchObject({
      code: "MATCH_ALREADY_COMPLETED",
    });
    expect(mapBackendError({ code: "P0002" }, "match")).toMatchObject({
      code: "MATCH_NOT_FOUND",
      category: "not_found",
    });
  });

  it("maps network and expired-session failures to retryable/auth states", () => {
    expect(
      mapBackendError(new TypeError("fetch failed"), "statistics"),
    ).toMatchObject({
      code: "NETWORK_UNAVAILABLE",
      retryable: true,
    });
    expect(mapAuthError({ code: "refresh_token_not_found" })).toMatchObject({
      code: "AUTH_SESSION_EXPIRED",
      category: "authentication",
    });
  });

  it("keeps permission failures distinct from missing resources", () => {
    expect(mapBackendError({ code: "42501" }, "match")).toMatchObject({
      code: "AUTH_UNAUTHORIZED",
      category: "authorization",
      retryable: false,
    });
  });
});
