import { z } from "zod";

export const MIN_TEAM_NAME_LENGTH = 2;
export const MAX_TEAM_NAME_LENGTH = 80;

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, "tooLong")
    .transform((value) => value || null);

const optionalColor = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine((value) => !value || /^#[0-9A-F]{6}$/.test(value), "invalidColor")
  .transform((value) => value || null);

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "required")
    .min(MIN_TEAM_NAME_LENGTH, "tooShort")
    .max(MAX_TEAM_NAME_LENGTH, "tooLong"),
  shortName: optionalText(20),
  city: optionalText(80),
  country: optionalText(80),
  primaryColor: optionalColor,
  secondaryColor: optionalColor,
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export function teamInputFromFormData(formData: FormData) {
  return {
    name: formData.get("name")?.toString() ?? "",
    shortName: formData.get("shortName")?.toString() ?? "",
    city: formData.get("city")?.toString() ?? "",
    country: formData.get("country")?.toString() ?? "",
    primaryColor: formData.get("primaryColor")?.toString() ?? "",
    secondaryColor: formData.get("secondaryColor")?.toString() ?? "",
  };
}
