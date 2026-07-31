import { z } from "zod";

export const callupSelectionSchema = z.object({
  playerIds: z
    .array(z.string().uuid("invalidPlayer"))
    .refine((ids) => new Set(ids).size === ids.length, "duplicatePlayer"),
});

export type CallupSelectionInput = z.infer<typeof callupSelectionSchema>;

export function callupInputFromFormData(formData: FormData) {
  return {
    playerIds: formData.getAll("playerIds").map((value) => value.toString()),
  };
}
