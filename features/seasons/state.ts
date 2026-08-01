export type SeasonField = "name" | "startDate" | "endDate";

export type SeasonFormActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<SeasonField, string>>;
  errorCode?: AppErrorCode;
  retryable?: boolean;
};

export type SeasonLifecycleActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errorCode?: AppErrorCode;
  retryable?: boolean;
};

export const initialSeasonFormState: SeasonFormActionState = {
  status: "idle",
};

export const initialSeasonLifecycleState: SeasonLifecycleActionState = {
  status: "idle",
};
import type { AppErrorCode } from "@/lib/errors/error-codes";
