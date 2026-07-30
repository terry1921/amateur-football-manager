import { describe, expect, it } from "vitest";
import type { DashboardFacts } from "./model";
import { getTeamSetupProgress } from "./progress";

const newTeamFacts: DashboardFacts = {
  teamExists: true,
  seasonExists: false,
  playerCount: 0,
  matchExists: false,
  callupExists: false,
  completedResultExists: false,
};

describe("getTeamSetupProgress", () => {
  it("reports one completed step and recommends a season for a new team", () => {
    const progress = getTeamSetupProgress(newTeamFacts);

    expect(progress.completedCount).toBe(1);
    expect(progress.totalCount).toBe(6);
    expect(progress.percentage).toBe(17);
    expect(progress.nextStep?.id).toBe("season");
    expect(progress.nextStep?.status).toBe("available");
    expect(progress.nextStep?.href).toBe("/seasons");
    expect(
      progress.steps.find(({ id }) => id === "players")?.featureAvailable,
    ).toBe(true);
  });

  it("reports three completed steps and recommends a match for partial setup", () => {
    const progress = getTeamSetupProgress({
      ...newTeamFacts,
      seasonExists: true,
      playerCount: 4,
    });

    expect(progress.completedCount).toBe(3);
    expect(progress.percentage).toBe(50);
    expect(progress.nextStep?.id).toBe("match");
    expect(progress.nextStep?.status).toBe("available");
    expect(progress.nextStep?.href).toBe("/matches");
  });

  it("recommends a call-up after the first match", () => {
    const progress = getTeamSetupProgress({
      ...newTeamFacts,
      seasonExists: true,
      playerCount: 4,
      matchExists: true,
    });

    expect(progress.completedCount).toBe(4);
    expect(progress.nextStep?.id).toBe("callup");
    expect(progress.isOperational).toBe(true);
  });

  it("marks every step complete from authoritative facts", () => {
    const progress = getTeamSetupProgress({
      teamExists: true,
      seasonExists: true,
      playerCount: 18,
      matchExists: true,
      callupExists: true,
      completedResultExists: true,
    });

    expect(progress.completedCount).toBe(6);
    expect(progress.percentage).toBe(100);
    expect(progress.isComplete).toBe(true);
    expect(progress.nextStep).toBeNull();
  });

  it("enforces meaningful step dependencies", () => {
    const progress = getTeamSetupProgress(newTeamFacts);
    const byId = Object.fromEntries(
      progress.steps.map((step) => [step.id, step]),
    );

    expect(byId.match.status).toBe("blocked");
    expect(byId.callup.status).toBe("blocked");
    expect(byId.result.status).toBe("blocked");

    const seasonOnly = getTeamSetupProgress({
      ...newTeamFacts,
      seasonExists: true,
    });
    expect(seasonOnly.steps.find((step) => step.id === "match")?.status).toBe(
      "available",
    );
    expect(seasonOnly.steps.find((step) => step.id === "callup")?.status).toBe(
      "blocked",
    );
  });
});
