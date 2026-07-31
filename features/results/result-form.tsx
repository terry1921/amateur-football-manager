"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type {
  MatchCallupPlayer,
  MatchEvent,
  MatchEventType,
  MatchLocation,
} from "@/features/matches/model";
import { getPlayerDisplayName } from "@/features/players/model";
import { Link } from "@/i18n/navigation";
import type { ResultDraftEvent } from "./model";
import { initialResultActionState, type ResultActionState } from "./state";

type ResultFormAction = (
  state: ResultActionState,
  formData: FormData,
) => Promise<ResultActionState>;

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations("Results.form");
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-pitch px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,163,49,0.16)] transition hover:bg-[#008f2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
    >
      {pending ? t("saving") : t("save")}
    </button>
  );
}

function ScoreField({
  id,
  name,
  label,
  team,
  value,
  error,
  onChange,
}: {
  id: string;
  name: "homeScore" | "awayScore";
  label: string;
  team: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-ink">
        {label} <span className="text-pitch">*</span>
        <span className="mt-1 block text-xs font-medium text-muted">
          {team}
        </span>
      </label>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min="0"
        step="1"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="min-h-14 w-full rounded-xl border border-[#b8c5d2] bg-white px-4 text-center text-2xl font-black text-ink outline-none transition focus:border-pitch focus:ring-3 focus:ring-pitch/10 aria-invalid:border-red-600"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function eventLabel(
  t: ReturnType<typeof useTranslations<"Results">>,
  type: MatchEventType,
) {
  return t(`eventTypes.${type}`);
}

function EventRow({
  event,
  players,
  onChange,
  onRemove,
}: {
  event: ResultDraftEvent;
  players: MatchCallupPlayer[];
  onChange: (event: ResultDraftEvent) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("Results");
  const playerId = `${event.clientId}-player`;
  const minuteId = `${event.clientId}-minute`;
  const label = eventLabel(t, event.type);
  return (
    <li className="grid gap-3 rounded-xl border border-line bg-[#f8faf9] p-4 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
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
          onChange={(input) =>
            onChange({ ...event, playerId: input.target.value })
          }
          className="min-h-11 w-full rounded-lg border border-[#b8c5d2] bg-white px-3 text-sm font-bold text-ink outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/10"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {getPlayerDisplayName(player)}
              {player.shirt_number === null ? "" : ` · #${player.shirt_number}`}
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
            onChange({
              ...event,
              minute:
                input.target.value === "" ? 0 : Number(input.target.value),
            })
          }
          className="min-h-11 w-full rounded-lg border border-[#b8c5d2] bg-white px-3 text-sm font-bold text-ink outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/10"
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="min-h-11 rounded-lg border border-[#b8c5d2] px-3 text-sm font-bold text-muted hover:border-red-300 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch sm:min-w-11"
        aria-label={t("form.removeEvent", { type: label })}
      >
        {t("form.remove")}
      </button>
    </li>
  );
}

function EventSection({
  type,
  events,
  players,
  onAdd,
  onChange,
  onRemove,
}: {
  type: MatchEventType;
  events: ResultDraftEvent[];
  players: MatchCallupPlayer[];
  onAdd: () => void;
  onChange: (event: ResultDraftEvent) => void;
  onRemove: (clientId: string) => void;
}) {
  const t = useTranslations("Results");
  const label = eventLabel(t, type);
  return (
    <section aria-labelledby={`${type}-heading`} className="space-y-3">
      <div className="flex flex-col gap-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
        <div>
          <h3
            id={`${type}-heading`}
            className="text-base font-black tracking-[-0.02em] text-ink"
          >
            {label}
          </h3>
          <p className="text-xs leading-5 text-muted">
            {t(`eventHelp.${type}`)}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={players.length === 0}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-pitch px-3 text-sm font-bold text-pitch hover:bg-pitch/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-not-allowed disabled:border-[#b8c5d2] disabled:text-muted"
        >
          {t("form.addEvent", { type: label })}
        </button>
      </div>
      {events.length > 0 ? (
        <ul className="space-y-2" aria-label={label}>
          {events.map((event) => (
            <EventRow
              key={event.clientId}
              event={event}
              players={players}
              onChange={onChange}
              onRemove={() => onRemove(event.clientId)}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-[#b8c5d2] px-4 py-3 text-sm text-muted">
          {t("form.none")}
        </p>
      )}
    </section>
  );
}

export function ResultForm({
  action,
  teamName,
  opponentName,
  location,
  cancelHref,
  players,
  initialEvents,
}: {
  action: ResultFormAction;
  teamName: string;
  opponentName: string;
  location: MatchLocation;
  cancelHref: string;
  players: MatchCallupPlayer[];
  initialEvents: MatchEvent[];
}) {
  const t = useTranslations("Results");
  const formId = useId();
  const [state, formAction] = useActionState(action, initialResultActionState);
  const [scores, setScores] = useState({ homeScore: "", awayScore: "" });
  const [events, setEvents] = useState<ResultDraftEvent[]>(() =>
    initialEvents.map((event) => ({
      clientId: `existing-${event.id}`,
      type: event.type,
      playerId: event.player_id,
      minute: event.minute,
    })),
  );
  const homeTeam = location === "away" ? opponentName : teamName;
  const awayTeam = location === "away" ? teamName : opponentName;
  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const managedScoreText =
    location === "away" ? scores.awayScore : scores.homeScore;
  const managedScore =
    managedScoreText === "" ? null : Number(managedScoreText);
  const goalCount = events.filter((event) => event.type === "goal").length;
  const reconciliationError =
    managedScore !== null &&
    Number.isSafeInteger(managedScore) &&
    managedScore >= 0 &&
    managedScore !== goalCount;
  const addEvent = (type: MatchEventType) => {
    const firstPlayer = players[0];
    if (!firstPlayer) return;
    setEvents((current) => [
      ...current,
      {
        clientId: `${type}-${crypto.randomUUID()}`,
        type,
        playerId: firstPlayer.id,
        minute: 0,
      },
    ]);
  };
  const eventPayload = JSON.stringify(
    events.map(({ type, playerId, minute }) => ({ type, playerId, minute })),
  );
  const summaryEvents = events
    .map((event) => ({
      ...event,
      playerName: playerById.get(event.playerId)
        ? getPlayerDisplayName(playerById.get(event.playerId)!)
        : t("unknownPlayer"),
    }))
    .sort((left, right) => left.minute - right.minute);

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          {state.message}
        </div>
      ) : null}
      <section
        aria-labelledby={`${formId}-score-heading`}
        className="space-y-4"
      >
        <div>
          <h3
            id={`${formId}-score-heading`}
            className="text-base font-black tracking-[-0.02em] text-ink"
          >
            {t("form.scoreHeading")}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            {t("form.orientation")}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <ScoreField
            id={`${formId}-homeScore`}
            name="homeScore"
            label={t("form.homeScore")}
            team={homeTeam}
            value={scores.homeScore}
            onChange={(value) =>
              setScores((current) => ({ ...current, homeScore: value }))
            }
            error={state.fieldErrors?.homeScore}
          />
          <ScoreField
            id={`${formId}-awayScore`}
            name="awayScore"
            label={t("form.awayScore")}
            team={awayTeam}
            value={scores.awayScore}
            onChange={(value) =>
              setScores((current) => ({ ...current, awayScore: value }))
            }
            error={state.fieldErrors?.awayScore}
          />
        </div>
        <p className="text-xs leading-5 text-muted">{t("form.requiredHelp")}</p>
      </section>

      <section
        aria-labelledby={`${formId}-events-heading`}
        className="space-y-5 border-t border-line pt-7"
      >
        <div>
          <h3
            id={`${formId}-events-heading`}
            className="text-xl font-black tracking-[-0.03em] text-ink"
          >
            {t("form.eventsHeading")}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            {players.length > 0
              ? t("form.eventsDescription")
              : t("form.noCallup")}
          </p>
        </div>
        <div className="space-y-6">
          {(["goal", "yellow_card", "red_card"] as const).map((type) => (
            <EventSection
              key={type}
              type={type}
              events={events.filter((event) => event.type === type)}
              players={players}
              onAdd={() => addEvent(type)}
              onChange={(next) =>
                setEvents((current) =>
                  current.map((event) =>
                    event.clientId === next.clientId ? next : event,
                  ),
                )
              }
              onRemove={(clientId) =>
                setEvents((current) =>
                  current.filter((event) => event.clientId !== clientId),
                )
              }
            />
          ))}
        </div>
        {state.fieldErrors?.events ? (
          <p role="alert" className="text-sm font-bold text-red-700">
            {state.fieldErrors.events}
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby={`${formId}-summary-heading`}
        className="space-y-3 border-t border-line pt-7"
      >
        <div>
          <h3
            id={`${formId}-summary-heading`}
            className="text-xl font-black tracking-[-0.03em] text-ink"
          >
            {t("form.summaryHeading")}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {t("form.eventCount", { count: events.length })}
          </p>
        </div>
        {reconciliationError ? (
          <p
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
          >
            {t("goalMismatch", {
              score: managedScore,
              count: goalCount,
            })}
          </p>
        ) : null}
        {summaryEvents.length > 0 ? (
          <ul className="space-y-2 text-sm text-ink">
            {summaryEvents.map((event) => (
              <li
                key={event.clientId}
                className="flex items-center justify-between gap-3"
              >
                <span>
                  <span className="font-bold">{event.playerName}</span>
                  <span className="text-muted">
                    {" "}
                    · {t(`eventTypes.${event.type}`)}
                  </span>
                </span>
                <span className="font-black text-pitch">
                  {event.minute}&apos;
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{t("form.none")}</p>
        )}
      </section>

      <input type="hidden" name="events" value={eventPayload} readOnly />
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#b8c5d2] bg-white px-6 text-sm font-bold text-ink transition hover:border-pitch hover:text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          {t("form.cancel")}
        </Link>
        <SubmitButton disabled={reconciliationError} />
      </div>
    </form>
  );
}
