export type TeamField =
  "name" | "shortName" | "city" | "country" | "primaryColor" | "secondaryColor";

export type CreateTeamActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<TeamField, string>>;
  errorCode?: AppErrorCode;
  retryable?: boolean;
};

export const initialCreateTeamState: CreateTeamActionState = { status: "idle" };
import type { AppErrorCode } from "@/lib/errors/error-codes";
