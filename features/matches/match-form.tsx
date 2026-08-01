"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FormErrorSummary } from "@/components/feedback/form-error-summary";
import { useOnlineStatus } from "@/components/feedback/use-online-status";
import type { MatchSeason } from "./data";
import { matchLocations } from "./model";
import {
  MAX_MATCH_NOTES_LENGTH,
  MAX_OPPONENT_NAME_LENGTH,
  MAX_VENUE_LENGTH,
} from "./schemas";
import {
  initialMatchFormState,
  type MatchField,
  type MatchFormActionState,
} from "./state";
import { utcToFormValues } from "./time";
import { useViewerTimeZone } from "./use-viewer-time-zone";

type MatchFormAction = (
  state: MatchFormActionState,
  formData: FormData,
) => Promise<MatchFormActionState>;

export type MatchFormValues = {
  seasonId: string;
  opponentName: string;
  kickoffAt: string;
  location: string;
  venue: string;
  notes: string;
};

function SubmitButton({
  editing,
  ready,
}: {
  editing: boolean;
  ready: boolean;
}) {
  const { pending } = useFormStatus();
  const online = useOnlineStatus();
  const t = useTranslations("Matches.form");
  return (
    <button
      type="submit"
      disabled={pending || !ready || !online}
      aria-busy={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-pitch px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,163,49,0.16)] transition hover:bg-[#008f2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-wait disabled:opacity-65 sm:w-auto"
    >
      {pending ? t("saving") : editing ? t("save") : t("create")}
    </button>
  );
}

function FieldError({ id, error }: { id: string; error: string | undefined }) {
  return error ? (
    <p id={id} className="mt-1.5 text-sm text-red-700">
      {error}
    </p>
  ) : null;
}

export function MatchForm({
  action,
  seasons,
  defaultSeasonId,
  defaultValues,
}: {
  action: MatchFormAction;
  seasons: MatchSeason[];
  defaultSeasonId: string | null;
  defaultValues?: MatchFormValues;
}) {
  const t = useTranslations("Matches.form");
  const tLocation = useTranslations("Matches.location");
  const [state, formAction] = useActionState(action, initialMatchFormState);
  const [creationKey] = useState(() =>
    typeof crypto === "undefined" ? "" : crypto.randomUUID(),
  );
  const timeZone = useViewerTimeZone();
  const formId = useId();
  const editing = Boolean(defaultValues);
  const fieldClass =
    "min-h-12 w-full rounded-xl border border-[#b8c5d2] bg-white px-4 text-base text-ink outline-none transition placeholder:text-muted/50 focus:border-pitch focus:ring-3 focus:ring-pitch/10 aria-invalid:border-red-600";

  const localKickoff =
    timeZone && defaultValues?.kickoffAt
      ? utcToFormValues(defaultValues.kickoffAt, timeZone)
      : null;

  const describedBy = (field: MatchField) =>
    state.fieldErrors?.[field] ? `${formId}-${field}-error` : undefined;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormErrorSummary message={state.message} />

      <input type="hidden" name="timeZone" value={timeZone} />
      {!editing ? (
        <input type="hidden" name="creationKey" value={creationKey} />
      ) : null}

      <div>
        <label
          htmlFor={`${formId}-seasonId`}
          className="mb-2 block text-sm font-bold text-ink"
        >
          {t("season")} <span className="text-pitch">*</span>
        </label>
        <select
          id={`${formId}-seasonId`}
          name="seasonId"
          required
          defaultValue={defaultValues?.seasonId ?? defaultSeasonId ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.seasonId)}
          aria-describedby={describedBy("seasonId")}
          className={fieldClass}
        >
          <option value="" disabled>
            {t("selectSeason")}
          </option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>
        <FieldError
          id={`${formId}-seasonId-error`}
          error={state.fieldErrors?.seasonId}
        />
      </div>

      <div>
        <label
          htmlFor={`${formId}-opponentName`}
          className="mb-2 block text-sm font-bold text-ink"
        >
          {t("opponent")} <span className="text-pitch">*</span>
        </label>
        <input
          id={`${formId}-opponentName`}
          name="opponentName"
          required
          maxLength={MAX_OPPONENT_NAME_LENGTH}
          defaultValue={defaultValues?.opponentName}
          placeholder={t("opponentPlaceholder")}
          aria-invalid={Boolean(state.fieldErrors?.opponentName)}
          aria-describedby={describedBy("opponentName")}
          className={fieldClass}
        />
        <FieldError
          id={`${formId}-opponentName-error`}
          error={state.fieldErrors?.opponentName}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${formId}-date`}
            className="mb-2 block text-sm font-bold text-ink"
          >
            {t("date")} <span className="text-pitch">*</span>
          </label>
          <input
            key={`date-${timeZone}`}
            id={`${formId}-date`}
            name="date"
            type="date"
            required
            defaultValue={localKickoff?.date ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.date)}
            aria-describedby={describedBy("date")}
            className={fieldClass}
          />
          <FieldError
            id={`${formId}-date-error`}
            error={state.fieldErrors?.date}
          />
        </div>
        <div>
          <label
            htmlFor={`${formId}-time`}
            className="mb-2 block text-sm font-bold text-ink"
          >
            {t("time")} <span className="text-pitch">*</span>
          </label>
          <input
            key={`time-${timeZone}`}
            id={`${formId}-time`}
            name="time"
            type="time"
            required
            defaultValue={localKickoff?.time ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.time)}
            aria-describedby={describedBy("time")}
            className={fieldClass}
          />
          <FieldError
            id={`${formId}-time-error`}
            error={state.fieldErrors?.time}
          />
        </div>
      </div>

      <p role="status" className="text-xs leading-5 text-muted">
        {timeZone ? t("timeZone", { timeZone }) : t("timeZoneLoading")}
      </p>
      <p className="text-xs leading-5 text-muted">{t("pastHelp")}</p>

      <div>
        <label
          htmlFor={`${formId}-location`}
          className="mb-2 block text-sm font-bold text-ink"
        >
          {t("location")} <span className="text-pitch">*</span>
        </label>
        <select
          id={`${formId}-location`}
          name="location"
          required
          defaultValue={defaultValues?.location ?? "home"}
          aria-invalid={Boolean(state.fieldErrors?.location)}
          aria-describedby={describedBy("location")}
          className={fieldClass}
        >
          {matchLocations.map((location) => (
            <option key={location} value={location}>
              {tLocation(location)}
            </option>
          ))}
        </select>
        <FieldError
          id={`${formId}-location-error`}
          error={state.fieldErrors?.location}
        />
      </div>

      <div>
        <label
          htmlFor={`${formId}-venue`}
          className="mb-2 block text-sm font-bold text-ink"
        >
          {t("venue")}
        </label>
        <input
          id={`${formId}-venue`}
          name="venue"
          maxLength={MAX_VENUE_LENGTH}
          defaultValue={defaultValues?.venue}
          placeholder={t("venuePlaceholder")}
          aria-invalid={Boolean(state.fieldErrors?.venue)}
          aria-describedby={describedBy("venue")}
          className={fieldClass}
        />
        <FieldError
          id={`${formId}-venue-error`}
          error={state.fieldErrors?.venue}
        />
      </div>

      <div>
        <label
          htmlFor={`${formId}-notes`}
          className="mb-2 block text-sm font-bold text-ink"
        >
          {t("notes")}
        </label>
        <textarea
          id={`${formId}-notes`}
          name="notes"
          rows={5}
          maxLength={MAX_MATCH_NOTES_LENGTH}
          defaultValue={defaultValues?.notes}
          placeholder={t("notesPlaceholder")}
          aria-invalid={Boolean(state.fieldErrors?.notes)}
          aria-describedby={describedBy("notes")}
          className={`${fieldClass} py-3`}
        />
        <FieldError
          id={`${formId}-notes-error`}
          error={state.fieldErrors?.notes}
        />
      </div>

      <div className="mobile-action-bar flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Link
          href="/matches"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#b8c5d2] bg-white px-6 text-sm font-bold text-ink transition hover:border-pitch hover:text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          {t("cancel")}
        </Link>
        <SubmitButton editing={editing} ready={Boolean(timeZone)} />
      </div>
    </form>
  );
}
