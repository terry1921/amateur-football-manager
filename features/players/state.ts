export type PlayerField =
  "firstName" | "lastName" | "nickname" | "shirtNumber" | "position" | "status";

export type PlayerFormActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<PlayerField, string>>;
  errorCode?: AppErrorCode;
  retryable?: boolean;
};

export type PlayerLifecycleActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errorCode?: AppErrorCode;
  retryable?: boolean;
};

export const initialPlayerFormState: PlayerFormActionState = { status: "idle" };
export const initialPlayerLifecycleState: PlayerLifecycleActionState = {
  status: "idle",
};
import type { AppErrorCode } from "@/lib/errors/error-codes";
