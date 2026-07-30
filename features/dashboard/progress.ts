import type {
  DashboardFacts,
  SetupStep,
  SetupStepId,
  TeamSetupProgress,
} from "./model";

type StepDefinition = {
  id: SetupStepId;
  href: string;
  featureAvailable: boolean;
  complete: (facts: DashboardFacts) => boolean;
  dependencyMet: (facts: DashboardFacts) => boolean;
};

// Future CRUD tasks activate their step here only after the destination is
// functional. Completion still comes exclusively from database facts.
const stepDefinitions: StepDefinition[] = [
  {
    id: "team",
    href: "/team",
    featureAvailable: true,
    complete: (facts) => facts.teamExists,
    dependencyMet: () => true,
  },
  {
    id: "season",
    href: "/seasons",
    featureAvailable: true,
    complete: (facts) => facts.seasonExists,
    dependencyMet: (facts) => facts.teamExists,
  },
  {
    id: "players",
    href: "/players",
    featureAvailable: false,
    complete: (facts) => facts.playerCount > 0,
    dependencyMet: (facts) => facts.teamExists,
  },
  {
    id: "match",
    href: "/matches",
    featureAvailable: false,
    complete: (facts) => facts.matchExists,
    dependencyMet: (facts) => facts.teamExists && facts.seasonExists,
  },
  {
    id: "callup",
    href: "/matches",
    featureAvailable: false,
    complete: (facts) => facts.callupExists,
    dependencyMet: (facts) => facts.playerCount > 0 && facts.matchExists,
  },
  {
    id: "result",
    href: "/matches",
    featureAvailable: false,
    complete: (facts) => facts.completedResultExists,
    dependencyMet: (facts) => facts.matchExists,
  },
];

function toStep(definition: StepDefinition, facts: DashboardFacts): SetupStep {
  const completed = definition.complete(facts);
  const dependencyMet = definition.dependencyMet(facts);
  const status = completed
    ? "completed"
    : !dependencyMet
      ? "blocked"
      : definition.featureAvailable
        ? "available"
        : "upcoming";

  return {
    id: definition.id,
    completed,
    dependencyMet,
    featureAvailable: definition.featureAvailable,
    status,
    href: definition.href,
  };
}

export function getTeamSetupProgress(facts: DashboardFacts): TeamSetupProgress {
  const steps = stepDefinitions.map((definition) => toStep(definition, facts));
  const completedCount = steps.filter((step) => step.completed).length;
  const totalCount = steps.length;

  return {
    completedCount,
    totalCount,
    percentage: Math.round((completedCount / totalCount) * 100),
    isComplete: completedCount === totalCount,
    isOperational:
      facts.seasonExists && facts.playerCount > 0 && facts.matchExists,
    nextStep: steps.find((step) => !step.completed) ?? null,
    steps,
  };
}
