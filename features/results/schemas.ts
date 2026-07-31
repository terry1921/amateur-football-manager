import { z } from "zod";
import { matchEventTypes } from "@/features/matches/model";

const POSTGRES_INTEGER_MAX = 2_147_483_647;

const scoreField = z
  .string()
  .trim()
  .min(1, "required")
  .regex(/^\d+$/, "integer")
  .transform(Number)
  .refine(Number.isSafeInteger, "integer")
  .refine((value) => value <= POSTGRES_INTEGER_MAX, "tooLarge");

export const resultSchema = z.object({
  homeScore: scoreField,
  awayScore: scoreField,
});

const resultEventSchema = z
  .object({
    type: z.enum(matchEventTypes, { message: "invalidType" }),
    playerId: z.string().uuid("invalidPlayer"),
    minute: z
      .number()
      .refine(Number.isInteger, "integer")
      .min(0, "nonNegative")
      .max(POSTGRES_INTEGER_MAX, "tooLarge"),
    stoppageTime: z
      .number()
      .refine(Number.isInteger, "integer")
      .min(0, "nonNegative")
      .max(POSTGRES_INTEGER_MAX, "tooLarge")
      .optional()
      .default(0),
    notes: z.string().trim().max(500, "notesTooLong").optional().default(""),
  })
  .strict();

const eventRowsField = z
  .string()
  .trim()
  .min(2, "requiredEvents")
  .transform((value, context) => {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: "custom", message: "invalidEvents" });
      return z.NEVER;
    }
  })
  .pipe(z.array(resultEventSchema).max(250, "tooMany"));

export const resultSubmissionSchema = resultSchema.extend({
  events: eventRowsField,
});

export type ResultField = keyof z.input<typeof resultSubmissionSchema>;
export type ResultSubmission = z.output<typeof resultSubmissionSchema>;

export function resultInputFromFormData(formData: FormData) {
  return {
    homeScore: formData.get("homeScore")?.toString() ?? "",
    awayScore: formData.get("awayScore")?.toString() ?? "",
    events: formData.get("events")?.toString() ?? "[]",
  };
}
