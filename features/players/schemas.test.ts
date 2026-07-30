import { describe, expect, it } from "vitest";
import { playerInputFromFormData, playerSchema } from "./schemas";

describe("playerSchema", () => {
  it("trims required and optional fields and accepts an empty shirt number", () => {
    expect(
      playerSchema.parse({
        firstName: "  Diego ",
        lastName: " Ramírez ",
        nickname: "  Didi  ",
        shirtNumber: "",
        position: "GK",
        status: "active",
      }),
    ).toEqual({
      firstName: "Diego",
      lastName: "Ramírez",
      nickname: "Didi",
      shirtNumber: null,
      position: "GK",
      status: "active",
    });
  });

  it.each(["-1", "100", "1.5", "not-a-number"])(
    "rejects invalid shirt number %s",
    (shirtNumber) => {
      const result = playerSchema.safeParse({
        firstName: "Diego",
        lastName: "",
        nickname: "",
        shirtNumber,
        position: "GK",
        status: "active",
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.issues[0]?.path).toEqual(["shirtNumber"]);
    },
  );

  it("rejects unsupported positions and statuses", () => {
    const result = playerSchema.safeParse({
      firstName: "Diego",
      lastName: "",
      nickname: "",
      shirtNumber: "1",
      position: "STRIKER",
      status: "retired",
    });
    expect(result.success).toBe(false);
  });
});

describe("playerInputFromFormData", () => {
  it("accepts only editable fields and ignores forged ownership data", () => {
    const data = new FormData();
    data.set("firstName", "Diego");
    data.set("lastName", "Ramírez");
    data.set("nickname", "Didi");
    data.set("shirtNumber", "1");
    data.set("position", "GK");
    data.set("status", "active");
    data.set("teamId", "forged-team");
    data.set("ownerId", "forged-owner");

    expect(playerInputFromFormData(data)).toEqual({
      firstName: "Diego",
      lastName: "Ramírez",
      nickname: "Didi",
      shirtNumber: "1",
      position: "GK",
      status: "active",
    });
  });
});
