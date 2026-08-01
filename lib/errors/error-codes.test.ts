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

  it("keeps uncertain match creation retryable without hiding duplicate intent", () => {
    expect(
      mapBackendError(
        {
          code: "23505",
          message: "matches_team_creation_key_unique_idx",
        },
        "match",
      ),
    ).toMatchObject({
      code: "MATCH_DUPLICATE_SUBMISSION",
      category: "conflict",
      retryable: false,
    });
  });

  it("maps result integrity and call-up lifecycle conflicts separately", () => {
    expect(
      mapBackendError(
        { code: "22023", message: "goal_count_mismatch" },
        "result",
      ),
    ).toMatchObject({ code: "GOAL_COUNT_MISMATCH", category: "validation" });
    expect(mapBackendError({ code: "23503" }, "callup")).toMatchObject({
      code: "PLAYER_NOT_IN_CALLUP",
      category: "validation",
    });
    expect(mapBackendError({ code: "55000" }, "callup")).toMatchObject({
      code: "CALLUP_READ_ONLY",
      category: "conflict",
    });
  });
});
