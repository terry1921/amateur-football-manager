export type TeamField =
  "name" | "shortName" | "city" | "country" | "primaryColor" | "secondaryColor";

export type CreateTeamActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Partial<Record<TeamField, string>>;
};

export const initialCreateTeamState: CreateTeamActionState = { status: "idle" };
