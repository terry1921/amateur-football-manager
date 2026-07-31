import { MatchTimeline } from "@/features/timeline/timeline";
import type { TimelineEvent } from "@/features/timeline/model";
import type { MatchEvent } from "./model";

export async function MatchEventHistory({ events }: { events: MatchEvent[] }) {
  const timelineEvents: TimelineEvent[] = events.map((event) => ({
    id: event.id,
    playerId: event.player_id,
    type: event.type,
    minute: event.minute,
    stoppageTime: event.stoppage_time,
    notes: event.notes,
    createdAt: event.created_at,
    playerName: event.player_name,
    playerShirtNumber: event.player_shirt_number,
  }));
  return (
    <div className="border-t border-line p-5 sm:p-6">
      <MatchTimeline events={timelineEvents} />
    </div>
  );
}
