import type { ResultField } from "./schemas";
import type { AppErrorCode } from "@/lib/errors/error-codes";

export type ResultActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<ResultField, string>>;
  eventError?: string;
  errorCode?: AppErrorCode;
  retryable?: boolean;
};

export const initialResultActionState: ResultActionState = { status: "idle" };
