export type CallupActionState = {
  status: "idle" | "error";
  message?: string;
};

export const initialCallupActionState: CallupActionState = { status: "idle" };
