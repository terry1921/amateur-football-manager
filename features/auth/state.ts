import type { AuthField } from "./schemas";
import type { AppErrorCode } from "@/lib/errors/error-codes";

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<AuthField, string>>;
  errorCode?: AppErrorCode;
  retryable?: boolean;
};

export const initialAuthState: AuthActionState = { status: "idle" };
