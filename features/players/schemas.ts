import { z } from "zod";
import { playerPositions, playerStatuses } from "./model";

export const MAX_PLAYER_NAME_LENGTH = 80;
export const MAX_PLAYER_NICKNAME_LENGTH = 80;

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, "tooLong")
    .transform((value) => value || null);

const shirtNumber = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value)))
  .refine(
    (value) =>
      value === null || (Number.isInteger(value) && value >= 0 && value <= 999),
    "invalidShirtNumber",
  );

export const playerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "required")
    .max(MAX_PLAYER_NAME_LENGTH, "tooLong"),
  lastName: optionalText(MAX_PLAYER_NAME_LENGTH),
  nickname: optionalText(MAX_PLAYER_NICKNAME_LENGTH),
  shirtNumber,
  position: z.enum(playerPositions, { error: "invalidPosition" }),
  status: z.enum(playerStatuses, { error: "invalidStatus" }),
});

export type PlayerInput = z.infer<typeof playerSchema>;

export function playerInputFromFormData(formData: FormData) {
  return {
    firstName: formData.get("firstName")?.toString() ?? "",
    lastName: formData.get("lastName")?.toString() ?? "",
    nickname: formData.get("nickname")?.toString() ?? "",
    shirtNumber: formData.get("shirtNumber")?.toString() ?? "",
    position: formData.get("position")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "active",
  };
}
