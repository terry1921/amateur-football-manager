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
};

export type MatchLifecycleActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialMatchFormState: MatchFormActionState = { status: "idle" };
export const initialMatchLifecycleState: MatchLifecycleActionState = {
  status: "idle",
};
