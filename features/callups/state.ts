import type { AppErrorCode } from "@/lib/errors/error-codes";

export type CallupActionState = {
  status: "idle" | "error";
  message?: string;
  errorCode?: AppErrorCode;
  retryable?: boolean;
};

export const initialCallupActionState: CallupActionState = { status: "idle" };
