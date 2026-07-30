import { describe, expect, it } from "vitest";
import { createTeamSchema, teamInputFromFormData } from "./schemas";

describe("createTeamSchema", () => {
  it("rejects an empty team name", () => {
    const result = createTeamSchema.safeParse({
      name: "   ",
      shortName: "",
      city: "",
      country: "",
      primaryColor: "",
      secondaryColor: "",
    });

    expect(result.success).toBe(false);
  });

  it("trims a valid name and converts empty optional values to null", () => {
    const result = createTeamSchema.parse({
      name: "  Loros FC  ",
      shortName: " Loros ",
      city: "",
      country: " Mexico ",
      primaryColor: "#00a331",
      secondaryColor: "",
    });

    expect(result).toEqual({
      name: "Loros FC",
      shortName: "Loros",
      city: null,
      country: "Mexico",
      primaryColor: "#00A331",
      secondaryColor: null,
    });
  });

  it("does not read an owner ID from form data", () => {
    const formData = new FormData();
    formData.set("name", "Loros FC");
    formData.set("owner_id", "spoofed-user-id");

    expect(teamInputFromFormData(formData)).not.toHaveProperty("owner_id");
  });
});
