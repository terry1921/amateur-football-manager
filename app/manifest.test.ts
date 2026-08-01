import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("PWA manifest", () => {
  it("defines an installable standalone mobile shell", () => {
    const value = manifest();

    expect(value.display).toBe("standalone");
    expect(value.start_url).toBe("/en/dashboard");
    expect(value.scope).toBe("/");
    expect(value.theme_color).toBe("#071a36");
    expect(value.icons?.[0]).toMatchObject({
      src: "/icon.svg",
      type: "image/svg+xml",
      purpose: "maskable",
    });
  });
});
