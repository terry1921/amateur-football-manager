import type { MatchEventType } from "@/features/matches/model";

export type TimelineEvent = {
  id: string;
  clientId?: string;
  playerId: string;
  type: MatchEventType;
  minute: number;
  stoppageTime?: number;
  notes?: string | null;
  createdAt?: string;
  playerName: string;
  playerShirtNumber?: number | null;
};

export type TimelineFilter = "all" | MatchEventType;

export type TimelineGroups<T extends TimelineEvent = TimelineEvent> = {
  goals: T[];
  yellowCards: T[];
  redCards: T[];
};

export type TimelinePlayerCount = {
  playerId: string;
  playerName: string;
  count: number;
};

export type TimelineSummary = {
  goals: number;
  yellowCards: number;
  redCards: number;
  goalsByPlayer: TimelinePlayerCount[];
  yellowCardsByPlayer: TimelinePlayerCount[];
  redCardsByPlayer: TimelinePlayerCount[];
};

type SortableEvent = Pick<
  TimelineEvent,
  "minute" | "stoppageTime" | "createdAt" | "id" | "clientId"
>;

function stoppageTimeOf(event: Pick<TimelineEvent, "stoppageTime">) {
  return event.stoppageTime ?? 0;
}

function creationKey(
  event: Pick<TimelineEvent, "createdAt" | "id" | "clientId">,
) {
  return event.createdAt ?? event.id ?? event.clientId ?? "";
}

export function sortEvents<T extends SortableEvent>(events: T[]) {
  return events
    .map((event, index) => ({ event, index }))
    .sort(
      (left, right) =>
        left.event.minute - right.event.minute ||
        stoppageTimeOf(left.event) - stoppageTimeOf(right.event) ||
        creationKey(left.event).localeCompare(creationKey(right.event)) ||
        left.index - right.index,
    )
    .map(({ event }) => event);
}

export function getMatchTimeline<T extends SortableEvent>(events: T[]) {
  return sortEvents(events);
}

export function formatFootballMinute(minute: number, stoppageTime = 0) {
  return `${minute}${stoppageTime > 0 ? `+${stoppageTime}` : ""}'`;
}

export function getEventIcon(type: MatchEventType) {
  if (type === "goal") return "⚽";
  if (type === "yellow_card") return "🟨";
  return "🟥";
}

export function getGroupedEvents<T extends TimelineEvent>(events: T[]) {
  const groups: TimelineGroups<T> = {
    goals: [],
    yellowCards: [],
    redCards: [],
  };

  for (const event of sortEvents(events)) {
    if (event.type === "goal") groups.goals.push(event);
    else if (event.type === "yellow_card") groups.yellowCards.push(event);
    else groups.redCards.push(event);
  }
  return groups;
}

function playerCounts<T extends TimelineEvent>(events: T[]) {
  const counts = new Map<string, TimelinePlayerCount>();
  for (const event of events) {
    const current = counts.get(event.playerId);
    if (current) current.count += 1;
    else {
      counts.set(event.playerId, {
        playerId: event.playerId,
        playerName: event.playerName,
        count: 1,
      });
    }
  }
  return [...counts.values()].sort(
    (left, right) =>
      right.count - left.count ||
      left.playerName.localeCompare(right.playerName),
  );
}

export function getTimelineSummary<T extends TimelineEvent>(
  events: T[],
): TimelineSummary {
  const groups = getGroupedEvents(events);
  return {
    goals: groups.goals.length,
    yellowCards: groups.yellowCards.length,
    redCards: groups.redCards.length,
    goalsByPlayer: playerCounts(groups.goals),
    yellowCardsByPlayer: playerCounts(groups.yellowCards),
    redCardsByPlayer: playerCounts(groups.redCards),
  };
}

export function filterTimelineEvents<T extends TimelineEvent>(
  events: T[],
  filter: TimelineFilter,
  search: string,
) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return getMatchTimeline(events).filter((event) => {
    const matchesType = filter === "all" || event.type === filter;
    const matchesPlayer =
      !normalizedSearch ||
      event.playerName.toLocaleLowerCase().includes(normalizedSearch);
    return matchesType && matchesPlayer;
  });
}
