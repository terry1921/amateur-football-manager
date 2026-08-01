export type MatchField =
  | "seasonId"
  | "opponentName"
  | "date"
  | "time"
  | "timeZone"
  | "location"
  | "venue"
  | "notes";

export type MatchFormActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<MatchField, string>>;
  errorCode?: AppErrorCode;
  retryable?: boolean;
};

export type MatchLifecycleActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errorCode?: AppErrorCode;
  retryable?: boolean;
};

export const initialMatchFormState: MatchFormActionState = { status: "idle" };
export const initialMatchLifecycleState: MatchLifecycleActionState = {
  status: "idle",
};
import type { AppErrorCode } from "@/lib/errors/error-codes";
