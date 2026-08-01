export type AppErrorCategory =
  | "validation"
  | "authentication"
  | "authorization"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "network"
  | "offline"
  | "database"
  | "storage"
  | "export"
  | "unexpected";

export type AppErrorCode =
  | "AUTH_SESSION_EXPIRED"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_CONFIRMATION_REQUIRED"
  | "AUTH_UNAUTHORIZED"
  | "TEAM_NOT_FOUND"
  | "SEASON_NOT_FOUND"
  | "SEASON_ALREADY_ACTIVE"
  | "PLAYER_NOT_FOUND"
  | "DUPLICATE_SHIRT_NUMBER"
  | "PLAYER_HAS_HISTORY"
  | "MATCH_NOT_FOUND"
  | "MATCH_ALREADY_COMPLETED"
  | "MATCH_DUPLICATE_SUBMISSION"
  | "MATCH_CANCELLED"
  | "MATCH_HAS_HISTORY"
  | "CALLUP_READ_ONLY"
  | "PLAYER_NOT_IN_CALLUP"
  | "GOAL_COUNT_MISMATCH"
  | "RESULT_CONFLICT"
  | "STATISTICS_UNAVAILABLE"
  | "NETWORK_UNAVAILABLE"
  | "OFFLINE"
  | "EXPORT_FAILED"
  | "MIGRATION_MISSING"
  | "UNEXPECTED_ERROR";

export type AppErrorInput = {
  code: AppErrorCode;
  category: AppErrorCategory;
  userMessage?: string;
  recoverable?: boolean;
  retryable?: boolean;
  fieldErrors?: Record<string, string>;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly category: AppErrorCategory;
  readonly userMessage?: string;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string>;

  constructor(input: AppErrorInput) {
    super(input.code);
    this.name = "AppError";
    this.code = input.code;
    this.category = input.category;
    this.userMessage = input.userMessage;
    this.recoverable = input.recoverable ?? true;
    this.retryable = input.retryable ?? input.category === "network";
    this.fieldErrors = input.fieldErrors;
    if (input.cause !== undefined) this.cause = input.cause;
  }
}

export function appError(input: AppErrorInput) {
  return new AppError(input);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
