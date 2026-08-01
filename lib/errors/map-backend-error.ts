import { appError, type AppError, type AppErrorCode } from "./error-codes";

type BackendErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  name?: string;
};

export type BackendErrorContext =
  | "team"
  | "season"
  | "player"
  | "match"
  | "callup"
  | "result"
  | "statistics"
  | "export";

function errorParts(error: unknown): BackendErrorLike {
  if (typeof error !== "object" || error === null) return {};
  const value = error as Record<string, unknown>;
  return {
    code: typeof value.code === "string" ? value.code : undefined,
    message: typeof value.message === "string" ? value.message : undefined,
    details: typeof value.details === "string" ? value.details : undefined,
    hint: typeof value.hint === "string" ? value.hint : undefined,
    name: typeof value.name === "string" ? value.name : undefined,
  };
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function networkFailure(error: unknown) {
  if (error instanceof TypeError) return true;
  const { name, message } = errorParts(error);
  return (
    name === "AbortError" ||
    includesAny((message ?? "").toLowerCase(), [
      "failed to fetch",
      "networkerror",
      "network request failed",
      "fetch failed",
      "timed out",
    ])
  );
}

export function mapBackendError(
  error: unknown,
  context: BackendErrorContext,
): AppError {
  if (networkFailure(error)) {
    return appError({
      code: "NETWORK_UNAVAILABLE",
      category: "network",
      retryable: true,
      cause: error,
    });
  }

  const { code, message, details } = errorParts(error);
  const searchable = `${message ?? ""} ${details ?? ""}`.toLowerCase();

  if (code === "42501") {
    return appError({
      code: "AUTH_UNAUTHORIZED",
      category: "authorization",
      recoverable: false,
      retryable: false,
    });
  }

  if (code === "PGRST116" || code === "P0002") {
    const notFoundCode: AppErrorCode =
      context === "player"
        ? "PLAYER_NOT_FOUND"
        : context === "season"
          ? "SEASON_NOT_FOUND"
          : context === "match" || context === "result" || context === "callup"
            ? "MATCH_NOT_FOUND"
            : "TEAM_NOT_FOUND";
    return appError({ code: notFoundCode, category: "not_found" });
  }

  if (code === "23505") {
    return appError({
      code: searchable.includes("matches_team_creation_key_unique_idx")
        ? "MATCH_DUPLICATE_SUBMISSION"
        : includesAny(searchable, ["shirt", "jersey", "dorsal"])
          ? "DUPLICATE_SHIRT_NUMBER"
          : "RESULT_CONFLICT",
      category: "conflict",
    });
  }

  if (code === "55000") {
    if (context === "result") {
      return appError({
        code: "MATCH_ALREADY_COMPLETED",
        category: "conflict",
      });
    }
    if (context === "callup") {
      return appError({ code: "CALLUP_READ_ONLY", category: "conflict" });
    }
    return appError({ code: "RESULT_CONFLICT", category: "conflict" });
  }

  if (code === "23503" && (context === "callup" || context === "result")) {
    return appError({ code: "PLAYER_NOT_IN_CALLUP", category: "validation" });
  }

  if (code === "22023") {
    if (searchable.includes("goal_count_mismatch")) {
      return appError({ code: "GOAL_COUNT_MISMATCH", category: "validation" });
    }
    if (context === "season") {
      return appError({ code: "SEASON_ALREADY_ACTIVE", category: "conflict" });
    }
    return appError({ code: "RESULT_CONFLICT", category: "validation" });
  }

  if (code === "PGRST202" || code === "42883") {
    return appError({
      code: "MIGRATION_MISSING",
      category: "database",
      recoverable: false,
      retryable: false,
    });
  }

  if (["22P02", "23502", "23514", "22001"].includes(code ?? "")) {
    return appError({ code: "RESULT_CONFLICT", category: "validation" });
  }

  return appError({
    code:
      context === "statistics" ? "STATISTICS_UNAVAILABLE" : "UNEXPECTED_ERROR",
    category: "database",
    retryable: true,
    cause: error,
  });
}

export function mapAuthError(error: unknown): AppError {
  const { code } = errorParts(error);
  if (code === "invalid_credentials") {
    return appError({
      code: "AUTH_INVALID_CREDENTIALS",
      category: "authentication",
    });
  }
  if (code === "email_not_confirmed") {
    return appError({
      code: "AUTH_CONFIRMATION_REQUIRED",
      category: "authentication",
    });
  }
  if (code === "session_not_found" || code === "refresh_token_not_found") {
    return appError({
      code: "AUTH_SESSION_EXPIRED",
      category: "authentication",
    });
  }
  return appError({
    code: "UNEXPECTED_ERROR",
    category: "authentication",
    retryable: true,
    cause: error,
  });
}
