"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { MatchCallupPlayer } from "@/features/matches/model";
import { getPlayerDisplayName } from "@/features/players/model";
import {
  filterTimelineEvents,
  formatFootballMinute,
  getEventIcon,
  getTimelineSummary,
  type TimelineEvent,
  type TimelineFilter,
} from "./model";

type TimelineChange = (event: TimelineEvent) => void;

function eventLabel(
  t: ReturnType<typeof useTranslations<"Results">>,
  type: TimelineEvent["type"],
) {
  return t(`eventTypes.${type}`);
}

function SummaryGroup({
  title,
  count,
  players,
}: {
  title: string;
  count: number;
  players: ReturnType<typeof getTimelineSummary>["goalsByPlayer"];
}) {
  return (
    <div className="rounded-xl border border-line bg-[#f8faf9] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-[0.08em] text-muted">
          {title}
        </h3>
        <span className="text-xl font-black text-ink">{count}</span>
      </div>
      {players.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-ink">
          {players.map((player) => (
            <li key={player.playerId} className="flex justify-between gap-3">
              <span className="truncate">{player.playerName}</span>
              <span className="font-bold text-pitch">{player.count}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ReadOnlyEventCard({ event }: { event: TimelineEvent }) {
  const t = useTranslations("Results");
  return (
    <li className="flex gap-3 rounded-xl border border-line bg-white p-4">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f8faf9] text-lg"
        aria-hidden="true"
      >
        {getEventIcon(event.type)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-bold text-ink">
            {event.playerName}
            {event.playerShirtNumber === null ||
            event.playerShirtNumber === undefined
              ? ""
              : ` · #${event.playerShirtNumber}`}
          </p>
          <span className="font-black text-pitch">
            {formatFootballMinute(event.minute, event.stoppageTime)}
          </span>
        </div>
        {event.notes ? (
          <p className="mt-1 text-sm leading-6 text-muted">{event.notes}</p>
        ) : null}
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-muted">
          {eventLabel(t, event.type)}
        </p>
      </div>
    </li>
  );
}

function EditableEventCard({
  event,
  players,
  onChange,
  onRemove,
}: {
  event: TimelineEvent;
  players: MatchCallupPlayer[];
  onChange: TimelineChange;
  onRemove: () => void;
}) {
  const t = useTranslations("Results");
  const key = event.clientId ?? event.id;
  const playerId = `${key}-player`;
  const minuteId = `${key}-minute`;
  const stoppageId = `${key}-stoppage`;
  const notesId = `${key}-notes`;
  const label = eventLabel(t, event.type);
  const patch = (changes: Partial<TimelineEvent>) =>
    onChange({ ...event, ...changes });

  return (
    <li className="rounded-xl border border-line bg-[#f8faf9] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-black text-ink">
          <span aria-hidden="true">{getEventIcon(event.type)}</span>
          {label}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="min-h-10 rounded-lg border border-[#b8c5d2] px-3 text-sm font-bold text-muted hover:border-red-300 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
          aria-label={t("form.removeEvent", { type: label })}
        >
          {t("form.remove")}
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem]">
        <div>
          <label
            htmlFor={playerId}
            className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-muted"
          >
            {t("form.player")}
          </label>
          <select
            id={playerId}
            value={event.playerId}
            onChange={(input) => {
              const player = players.find(
                ({ id }) => id === input.target.value,
              );
              patch({
                playerId: input.target.value,
                playerName: player
                  ? getPlayerDisplayName(player)
                  : t("form.unknownPlayer"),
                playerShirtNumber: player?.shirt_number ?? null,
              });
            }}
            className="min-h-11 w-full rounded-lg border border-[#b8c5d2] bg-white px-3 text-sm font-bold text-ink outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/10"
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {getPlayerDisplayName(player)}
                {player.shirt_number === null
                  ? ""
                  : ` · #${player.shirt_number}`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={minuteId}
            className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-muted"
          >
            {t("form.minute")}
          </label>
          <input
            id={minuteId}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={event.minute}
            onChange={(input) =>
              patch({
                minute:
                  input.target.value === "" ? 0 : Number(input.target.value),
              })
            }
            className="min-h-11 w-full rounded-lg border border-[#b8c5d2] bg-white px-3 text-sm font-bold text-ink outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/10"
          />
        </div>
        <div>
          <label
            htmlFor={stoppageId}
            className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-muted"
          >
            {t("form.stoppageTime")}
          </label>
          <input
            id={stoppageId}
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={event.stoppageTime ?? 0}
            onChange={(input) =>
              patch({
                stoppageTime:
                  input.target.value === "" ? 0 : Number(input.target.value),
              })
            }
            className="min-h-11 w-full rounded-lg border border-[#b8c5d2] bg-white px-3 text-sm font-bold text-ink outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/10"
          />
        </div>
      </div>
      <div className="mt-3">
        <label
          htmlFor={notesId}
          className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-muted"
        >
          {t("form.notes")}
        </label>
        <textarea
          id={notesId}
          value={event.notes ?? ""}
          maxLength={500}
          rows={2}
          onChange={(input) => patch({ notes: input.target.value })}
          className="w-full resize-y rounded-lg border border-[#b8c5d2] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/10"
        />
      </div>
    </li>
  );
}

export function MatchTimeline({
  events,
  players = [],
  editable = false,
  onChange,
  onRemove,
}: {
  events: TimelineEvent[];
  players?: MatchCallupPlayer[];
  editable?: boolean;
  onChange?: TimelineChange;
  onRemove?: (event: TimelineEvent) => void;
}) {
  const t = useTranslations("Results");
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [search, setSearch] = useState("");
  const summary = useMemo(() => getTimelineSummary(events), [events]);
  const visibleEvents = useMemo(
    () => filterTimelineEvents(events, filter, search),
    [events, filter, search],
  );
  const filters: Array<{ id: TimelineFilter; label: string }> = [
    { id: "all", label: t("timeline.filters.all") },
    { id: "goal", label: t("eventTypes.goal") },
    { id: "yellow_card", label: t("eventTypes.yellow_card") },
    { id: "red_card", label: t("eventTypes.red_card") },
  ];

  return (
    <section className="space-y-5" aria-labelledby="timeline-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="timeline-heading"
            className="text-xl font-black tracking-[-0.03em] text-ink"
          >
            {t("timeline.title")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {t("timeline.eventCount", { count: events.length })}
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <label htmlFor="timeline-player-search" className="sr-only">
            {t("timeline.search")}
          </label>
          <input
            id="timeline-player-search"
            type="search"
            value={search}
            onChange={(input) => setSearch(input.target.value)}
            placeholder={t("timeline.searchPlaceholder")}
            className="min-h-11 w-full rounded-lg border border-[#b8c5d2] bg-white px-3 text-sm text-ink outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/10"
          />
        </div>
      </div>

      <div
        className="mobile-chip-row flex flex-wrap gap-2"
        role="group"
        aria-label={t("timeline.filters.label")}
      >
        {filters.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            onClick={() => setFilter(option.id)}
            className={`min-h-10 rounded-lg px-3 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch ${filter === option.id ? "bg-pitch text-white" : "border border-[#b8c5d2] bg-white text-muted hover:border-pitch hover:text-pitch"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div
        className="grid gap-3 sm:grid-cols-3"
        aria-label={t("timeline.summary.label")}
      >
        <SummaryGroup
          title={t("eventTypes.goal")}
          count={summary.goals}
          players={summary.goalsByPlayer}
        />
        <SummaryGroup
          title={t("eventTypes.yellow_card")}
          count={summary.yellowCards}
          players={summary.yellowCardsByPlayer}
        />
        <SummaryGroup
          title={t("eventTypes.red_card")}
          count={summary.redCards}
          players={summary.redCardsByPlayer}
        />
      </div>

      {visibleEvents.length > 0 ? (
        <ol className="space-y-2" aria-live="polite">
          {visibleEvents.map((event) =>
            editable && onChange && onRemove ? (
              <EditableEventCard
                key={event.clientId ?? event.id}
                event={event}
                players={players}
                onChange={onChange}
                onRemove={() => onRemove(event)}
              />
            ) : (
              <ReadOnlyEventCard
                key={event.clientId ?? event.id}
                event={event}
              />
            ),
          )}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed border-[#b8c5d2] px-4 py-3 text-sm text-muted">
          {events.length === 0 ? t("history.none") : t("timeline.noMatches")}
        </p>
      )}
    </section>
  );
}
