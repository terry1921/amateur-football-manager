import { z } from "zod";

export const MAX_SEASON_NAME_LENGTH = 80;

const isoDate = z
  .string()
  .trim()
  .min(1, "required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate");

export const seasonSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "required")
      .max(MAX_SEASON_NAME_LENGTH, "tooLong"),
    startDate: isoDate,
    endDate: isoDate,
  })
  .refine(
    ({ startDate, endDate }) => !startDate || !endDate || endDate >= startDate,
    { path: ["endDate"], message: "endBeforeStart" },
  );

export type SeasonInput = z.infer<typeof seasonSchema>;

export function seasonInputFromFormData(formData: FormData) {
  return {
    name: formData.get("name")?.toString() ?? "",
    startDate: formData.get("startDate")?.toString() ?? "",
    endDate: formData.get("endDate")?.toString() ?? "",
  };
}
