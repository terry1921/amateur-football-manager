import { describe, expect, it } from "vitest";
import { renderSocialCardToCanvas, SOCIAL_EXPORT_SIZE } from "./export";
import type { SocialBranding, SocialContent } from "./model";

const branding: SocialBranding = {
  id: "team-1",
  name: "Loros FC",
  short_name: "Loros",
  logo_url: null,
  primary_color: "#00a331",
  secondary_color: "#071a36",
};

const content: SocialContent = {
  kind: "upcoming",
  title: "Upcoming match",
  eyebrow: "Loros FC",
  opponent: "Abejas FC",
  score: null,
  competition: "Liga",
  venue: "Cancha Norte",
  kickoffAt: "2026-08-01T18:00:00.000Z",
  season: "Apertura 2026",
  goalScorers: [],
  playerOfMatch: null,
  topScorer: null,
  lineup: [],
};

describe("social export", () => {
  it("renders a 1080px square card through the native canvas API", async () => {
    const calls: string[] = [];
    const context = {
      fillStyle: "",
      font: "",
      textAlign: "left",
      textBaseline: "alphabetic",
      fillRect: () => calls.push("fillRect"),
      fillText: () => calls.push("fillText"),
      beginPath: () => calls.push("beginPath"),
      arc: () => calls.push("arc"),
      fill: () => calls.push("fill"),
      save: () => calls.push("save"),
      clip: () => calls.push("clip"),
      restore: () => calls.push("restore"),
      drawImage: () => calls.push("drawImage"),
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement;

    await renderSocialCardToCanvas(canvas, {
      branding,
      content,
      labels: {
        competition: "Competition",
        venue: "Venue",
        goalScorers: "Goal scorers",
        topScorer: "Top scorer",
        playerOfMatch: "Player of the Match",
        lineup: "Lineup",
        noScorers: "No scorers",
      },
    });

    expect(canvas.width).toBe(SOCIAL_EXPORT_SIZE);
    expect(canvas.height).toBe(SOCIAL_EXPORT_SIZE);
    expect(calls).toContain("fillRect");
    expect(calls).toContain("fillText");
  });
});
