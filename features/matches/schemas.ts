import { z } from "zod";
import { matchLocations } from "./model";
import { isValidDateInput, isValidTimeInput, isValidTimeZone } from "./time";

export const MAX_OPPONENT_NAME_LENGTH = 120;
export const MAX_VENUE_LENGTH = 160;
export const MAX_MATCH_NOTES_LENGTH = 2000;

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum, "tooLong")
    .transform((value) => value || null);

export const matchSchema = z.object({
  seasonId: z.string().uuid("invalidSeason"),
  opponentName: z
    .string()
    .trim()
    .min(1, "required")
    .max(MAX_OPPONENT_NAME_LENGTH, "tooLong"),
  date: z.string().refine(isValidDateInput, "invalidDate"),
  time: z.string().refine(isValidTimeInput, "invalidTime"),
  timeZone: z.string().refine(isValidTimeZone, "invalidTimeZone"),
  location: z.enum(matchLocations, { error: "invalidLocation" }),
  venue: optionalText(MAX_VENUE_LENGTH),
  notes: optionalText(MAX_MATCH_NOTES_LENGTH),
});

export type MatchInput = z.infer<typeof matchSchema>;

export function matchInputFromFormData(formData: FormData) {
  return {
    seasonId: formData.get("seasonId")?.toString() ?? "",
    opponentName: formData.get("opponentName")?.toString() ?? "",
    date: formData.get("date")?.toString() ?? "",
    time: formData.get("time")?.toString() ?? "",
    timeZone: formData.get("timeZone")?.toString() ?? "",
    location: formData.get("location")?.toString() ?? "",
    venue: formData.get("venue")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  };
}
