import { describe, expect, it } from "vitest";
import { GET as cancel } from "./cancel/route";
import { GET as success } from "./success/route";

describe("billing checkout return routes", () => {
  it("returns successful checkout to the localized pricing confirmation", () => {
    const response = success();

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/en/pricing?checkout=success",
    );
  });

  it("returns canceled checkout to the localized pricing cancellation state", () => {
    const response = cancel();

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/en/pricing?checkout=canceled",
    );
  });
});
