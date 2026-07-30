import { describe, expect, it } from "vitest";
import { insertTeamWithUniqueSlug } from "./actions";
import type { CreateTeamInput } from "./schemas";

const input: CreateTeamInput = {
  name: "Loros FC",
  shortName: null,
  city: null,
  country: null,
  primaryColor: null,
  secondaryColor: null,
};

describe("insertTeamWithUniqueSlug", () => {
  it("uses the authenticated server owner and retries database slug collisions", async () => {
    const inserts: Array<Record<string, string | null>> = [];
    const client = {
      from: () => ({
        insert: async (values: Record<string, string | null>) => {
          inserts.push(values);
          return { error: inserts.length < 3 ? { code: "23505" } : null };
        },
      }),
    };

    await insertTeamWithUniqueSlug(client, "authenticated-user", input);

    expect(inserts.map(({ slug }) => slug)).toEqual([
      "loros-fc",
      "loros-fc-2",
      "loros-fc-3",
    ]);
    expect(
      inserts.every(({ owner_id }) => owner_id === "authenticated-user"),
    ).toBe(true);
  });

  it("does not retry non-constraint failures", async () => {
    const client = {
      from: () => ({
        insert: async () => ({ error: { code: "42501" } }),
      }),
    };

    await expect(
      insertTeamWithUniqueSlug(client, "authenticated-user", input),
    ).rejects.toMatchObject({ code: "42501" });
  });
});
