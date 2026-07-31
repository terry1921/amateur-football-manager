"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import type {
  MatchCallupPlayer,
  MatchEvent,
  MatchLocation,
} from "@/features/matches/model";
import { getPlayerDisplayName } from "@/features/players/model";
import { MatchTimeline } from "@/features/timeline/timeline";
import type { TimelineEvent } from "@/features/timeline/model";
import { matchEventTypes, type MatchEventType } from "@/features/matches/model";
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
      stoppageTime: event.stoppage_time,
      notes: event.notes ?? "",
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
        stoppageTime: 0,
        notes: "",
      },
    ]);
  };
  const eventPayload = JSON.stringify(
    events.map(({ type, playerId, minute, stoppageTime, notes }) => ({
      type,
      playerId,
      minute,
      stoppageTime: stoppageTime ?? 0,
      notes: notes ?? "",
    })),
  );
  const timelineEvents: TimelineEvent[] = events.map((event) => {
    const player = playerById.get(event.playerId);
    return {
      id: event.clientId,
      clientId: event.clientId,
      type: event.type,
      playerId: event.playerId,
      minute: event.minute,
      stoppageTime: event.stoppageTime ?? 0,
      notes: event.notes ?? "",
      playerName: player
        ? getPlayerDisplayName(player)
        : t("form.unknownPlayer"),
      playerShirtNumber: player?.shirt_number ?? null,
    };
  });

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
        <div className="flex flex-wrap gap-2">
          {matchEventTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addEvent(type)}
              disabled={players.length === 0}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-pitch px-3 text-sm font-bold text-pitch hover:bg-pitch/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-not-allowed disabled:border-[#b8c5d2] disabled:text-muted"
            >
              {t("form.addEvent", { type: t(`eventTypes.${type}`) })}
            </button>
          ))}
        </div>
        <MatchTimeline
          events={timelineEvents}
          players={players}
          editable
          onChange={(next) =>
            setEvents((current) =>
              current.map((event) =>
                event.clientId === next.clientId
                  ? {
                      ...event,
                      playerId: next.playerId,
                      minute: next.minute,
                      stoppageTime: next.stoppageTime ?? 0,
                      notes: next.notes ?? "",
                    }
                  : event,
              ),
            )
          }
          onRemove={(event) =>
            setEvents((current) =>
              current.filter((draft) => draft.clientId !== event.clientId),
            )
          }
        />
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
        <p className="text-sm text-muted">{t("form.summaryHelp")}</p>
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
