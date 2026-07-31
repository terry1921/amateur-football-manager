import type { MatchEventType, MatchLocation } from "@/features/matches/model";

export type ResultInput = {
  homeScore: number;
  awayScore: number;
};

export type ResultScore = ResultInput & {
  teamScore: number;
  opponentScore: number;
};

export type ResultEventInput = {
  type: MatchEventType;
  playerId: string;
  minute: number;
};

export type ResultDraftEvent = ResultEventInput & {
  clientId: string;
};

export function orientResultScore(
  input: ResultInput,
  location: MatchLocation,
): ResultScore {
  const managed =
    location === "away"
      ? { teamScore: input.awayScore, opponentScore: input.homeScore }
      : { teamScore: input.homeScore, opponentScore: input.awayScore };

  return { ...input, ...managed };
}
