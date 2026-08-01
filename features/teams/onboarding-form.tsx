"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { FormErrorSummary } from "@/components/feedback/form-error-summary";
import { useOnlineStatus } from "@/components/feedback/use-online-status";
import type { CreateTeamActionState, TeamField } from "./state";
import { initialCreateTeamState } from "./state";

type CreateTeamAction = (
  state: CreateTeamActionState,
  formData: FormData,
) => Promise<CreateTeamActionState>;

type FieldProps = {
  id: string;
  name: TeamField;
  label: string;
  error?: string;
  required?: boolean;
  autoComplete?: string;
  maxLength: number;
  placeholder?: string;
};

function Field({
  id,
  name,
  label,
  error,
  required,
  autoComplete,
  maxLength,
  placeholder,
}: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-ink">
        {label}
        {required ? <span className="ml-1 text-pitch">*</span> : null}
      </label>
      <input
        id={id}
        name={name}
        required={required}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="min-h-12 w-full rounded-xl border border-[#b8c5d2] bg-white px-4 text-base text-ink outline-none transition placeholder:text-muted/50 focus:border-pitch focus:ring-3 focus:ring-pitch/10 aria-invalid:border-red-600"
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const online = useOnlineStatus();
  const t = useTranslations("Onboarding");

  return (
    <button
      type="submit"
      disabled={pending || !online}
      aria-busy={pending}
      className="flex min-h-14 w-full items-center justify-center rounded-xl bg-pitch px-6 text-base font-bold text-white shadow-[0_12px_28px_rgba(0,163,49,0.18)] transition hover:bg-[#008f2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-wait disabled:opacity-65"
    >
      {pending ? t("creating") : t("submit")}
    </button>
  );
}

export function OnboardingForm({ action }: { action: CreateTeamAction }) {
  const t = useTranslations("Onboarding");
  const [state, formAction] = useActionState(action, initialCreateTeamState);
  const formId = useId();

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormErrorSummary message={state.message} />

      <Field
        id={`${formId}-name`}
        name="name"
        label={t("fields.name")}
        required
        autoComplete="organization"
        maxLength={80}
        error={state.fieldErrors?.name}
      />

      <Field
        id={`${formId}-short-name`}
        name="shortName"
        label={t("fields.shortName")}
        maxLength={20}
        error={state.fieldErrors?.shortName}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${formId}-city`}
          name="city"
          label={t("fields.city")}
          autoComplete="address-level2"
          maxLength={80}
          error={state.fieldErrors?.city}
        />
        <Field
          id={`${formId}-country`}
          name="country"
          label={t("fields.country")}
          autoComplete="country-name"
          maxLength={80}
          error={state.fieldErrors?.country}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${formId}-primary-color`}
          name="primaryColor"
          label={t("fields.primaryColor")}
          maxLength={7}
          placeholder="#00A331"
          error={state.fieldErrors?.primaryColor}
        />
        <Field
          id={`${formId}-secondary-color`}
          name="secondaryColor"
          label={t("fields.secondaryColor")}
          maxLength={7}
          placeholder="#071A36"
          error={state.fieldErrors?.secondaryColor}
        />
      </div>

      <div className="pt-1">
        <SubmitButton />
      </div>
    </form>
  );
}
