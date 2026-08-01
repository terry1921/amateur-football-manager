import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const serviceWorker = readFileSync(
  resolve(process.cwd(), "public/sw.js"),
  "utf8",
);

describe("mobile UX foundations", () => {
  it("protects the app shell from device safe areas and horizontal overflow", () => {
    expect(css).toContain("overflow-x: hidden");
    expect(css).toContain("env(safe-area-inset-top)");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain("min-height: 2.75rem");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("keeps the offline shell and navigation requests available", () => {
    expect(serviceWorker).toContain("/offline.html");
    expect(serviceWorker).toContain('event.request.mode === "navigate"');
    expect(serviceWorker).toContain('event.request.method !== "GET"');
  });
});
