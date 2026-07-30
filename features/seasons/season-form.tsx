"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MAX_SEASON_NAME_LENGTH } from "./schemas";
import { initialSeasonFormState, type SeasonFormActionState } from "./state";

type SeasonFormAction = (
  state: SeasonFormActionState,
  formData: FormData,
) => Promise<SeasonFormActionState>;

type SeasonFormValues = {
  name: string;
  startDate: string;
  endDate: string;
};

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  const t = useTranslations("Seasons.form");

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

export function SeasonForm({
  action,
  defaultValues,
}: {
  action: SeasonFormAction;
  defaultValues?: SeasonFormValues;
}) {
  const t = useTranslations("Seasons.form");
  const [state, formAction] = useActionState(action, initialSeasonFormState);
  const formId = useId();
  const editing = Boolean(defaultValues);

  const fields = [
    {
      name: "startDate" as const,
      label: t("startDate"),
      value: defaultValues?.startDate,
    },
    {
      name: "endDate" as const,
      label: t("endDate"),
      value: defaultValues?.endDate,
    },
  ];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <label
          htmlFor={`${formId}-name`}
          className="mb-2 block text-sm font-bold text-ink"
        >
          {t("name")} <span className="text-pitch">*</span>
        </label>
        <input
          id={`${formId}-name`}
          name="name"
          required
          maxLength={MAX_SEASON_NAME_LENGTH}
          defaultValue={defaultValues?.name}
          placeholder={t("namePlaceholder")}
          aria-invalid={Boolean(state.fieldErrors?.name)}
          aria-describedby={
            state.fieldErrors?.name ? `${formId}-name-error` : undefined
          }
          className="min-h-12 w-full rounded-xl border border-[#b8c5d2] bg-white px-4 text-base text-ink outline-none transition placeholder:text-muted/50 focus:border-pitch focus:ring-3 focus:ring-pitch/10 aria-invalid:border-red-600"
        />
        {state.fieldErrors?.name ? (
          <p
            id={`${formId}-name-error`}
            className="mt-1.5 text-sm text-red-700"
          >
            {state.fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name}>
            <label
              htmlFor={`${formId}-${field.name}`}
              className="mb-2 block text-sm font-bold text-ink"
            >
              {field.label} <span className="text-pitch">*</span>
            </label>
            <input
              id={`${formId}-${field.name}`}
              name={field.name}
              type="date"
              required
              defaultValue={field.value}
              aria-invalid={Boolean(state.fieldErrors?.[field.name])}
              aria-describedby={
                state.fieldErrors?.[field.name]
                  ? `${formId}-${field.name}-error`
                  : undefined
              }
              className="min-h-12 w-full rounded-xl border border-[#b8c5d2] bg-white px-4 text-base text-ink outline-none transition focus:border-pitch focus:ring-3 focus:ring-pitch/10 aria-invalid:border-red-600"
            />
            {state.fieldErrors?.[field.name] ? (
              <p
                id={`${formId}-${field.name}-error`}
                className="mt-1.5 text-sm text-red-700"
              >
                {state.fieldErrors[field.name]}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <p className="text-sm leading-6 text-muted">{t("dateHelp")}</p>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
        <Link
          href="/seasons"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#b8c5d2] bg-white px-6 text-sm font-bold text-ink transition hover:border-pitch hover:text-pitch focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
        >
          {t("cancel")}
        </Link>
        <SubmitButton editing={editing} />
      </div>
    </form>
  );
}
