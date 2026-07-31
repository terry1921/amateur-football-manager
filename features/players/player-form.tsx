"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { playerPositions, playerStatuses } from "./model";
import type { PlayerFormActionState } from "./state";
import { initialPlayerFormState } from "./state";

type PlayerFormAction = (
  state: PlayerFormActionState,
  formData: FormData,
) => Promise<PlayerFormActionState>;

export type PlayerFormValues = {
  firstName: string;
  lastName: string;
  nickname: string;
  shirtNumber: string;
  position: string;
  status: string;
};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations("Players.form");
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-pitch px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,163,49,0.16)] transition hover:bg-[#008f2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-wait disabled:opacity-65 sm:w-auto"
    >
      {pending ? t("saving") : editing ? t("save") : t("create")}
    </button>
  );
}

export function PlayerForm({
  action,
  defaultValues,
}: {
  action: PlayerFormAction;
  defaultValues?: PlayerFormValues;
}) {
  const t = useTranslations("Players.form");
  const tStatus = useTranslations("Players.status");
  const tPosition = useTranslations("Players.position");
  const [state, formAction] = useActionState(action, initialPlayerFormState);
  const formId = useId();
  const editing = Boolean(defaultValues);
  const fieldClass =
    "min-h-12 w-full rounded-xl border border-[#b8c5d2] bg-white px-4 text-base text-ink outline-none transition placeholder:text-muted/50 focus:border-pitch focus:ring-3 focus:ring-pitch/10 aria-invalid:border-red-600";

  const textFields = [
    ["firstName", t("firstName"), t("firstNamePlaceholder"), true],
    ["lastName", t("lastName"), t("lastNamePlaceholder"), false],
    ["nickname", t("nickname"), t("nicknamePlaceholder"), false],
  ] as const;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.message}
        </div>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        {textFields.map(([name, label, placeholder, required]) => (
          <div
            key={name}
            className={name === "nickname" ? "sm:col-span-2" : ""}
          >
            <label
              htmlFor={`${formId}-${name}`}
              className="mb-2 block text-sm font-bold text-ink"
            >
              {label}
              {required ? <span className="text-pitch"> *</span> : null}
            </label>
            <input
              id={`${formId}-${name}`}
              name={name}
              required={required}
              maxLength={80}
              defaultValue={defaultValues?.[name]}
              placeholder={placeholder}
              aria-invalid={Boolean(state.fieldErrors?.[name])}
              className={fieldClass}
            />
            {state.fieldErrors?.[name] ? (
              <p className="mt-1.5 text-sm text-red-700">
                {state.fieldErrors[name]}
              </p>
            ) : null}
          </div>
        ))}
        <div>
          <label
            htmlFor={`${formId}-shirtNumber`}
            className="mb-2 block text-sm font-bold text-ink"
          >
            {t("shirtNumber")}
          </label>
          <input
            id={`${formId}-shirtNumber`}
            name="shirtNumber"
            inputMode="numeric"
            min="0"
            max="999"
            defaultValue={defaultValues?.shirtNumber}
            placeholder={t("shirtNumberPlaceholder")}
            aria-invalid={Boolean(state.fieldErrors?.shirtNumber)}
            className={fieldClass}
          />
          {state.fieldErrors?.shirtNumber ? (
            <p className="mt-1.5 text-sm text-red-700">
              {state.fieldErrors.shirtNumber}
            </p>
          ) : null}
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {t("shirtHelp")}
          </p>
        </div>
        <div>
          <label
            htmlFor={`${formId}-position`}
            className="mb-2 block text-sm font-bold text-ink"
          >
            {t("position")} <span className="text-pitch">*</span>
          </label>
          <select
            id={`${formId}-position`}
            name="position"
            required
            defaultValue={defaultValues?.position ?? ""}
            aria-invalid={Boolean(state.fieldErrors?.position)}
            className={fieldClass}
          >
            <option value="" disabled>
              {t("selectPosition")}
            </option>
            {playerPositions.map((position) => (
              <option key={position} value={position}>
                {tPosition(position)}
              </option>
            ))}
          </select>
          {state.fieldErrors?.position ? (
            <p className="mt-1.5 text-sm text-red-700">
              {state.fieldErrors.position}
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor={`${formId}-status`}
            className="mb-2 block text-sm font-bold text-ink"
          >
            {t("status")} <span className="text-pitch">*</span>
          </label>
          <select
            id={`${formId}-status`}
            name="status"
            required
            defaultValue={defaultValues?.status ?? "active"}
            className={fieldClass}
          >
            {playerStatuses.map((status) => (
              <option key={status} value={status}>
                {tStatus(status)}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            {t("statusHelp")}
          </p>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Link
          href="/players"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#b8c5d2] bg-white px-6 text-sm font-bold text-ink transition hover:border-pitch hover:text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          {t("cancel")}
        </Link>
        <SubmitButton editing={editing} />
      </div>
    </form>
  );
}
