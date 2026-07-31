import type { ResultField } from "./schemas";

export type ResultActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<ResultField, string>>;
  eventError?: string;
};

export const initialResultActionState: ResultActionState = { status: "idle" };
