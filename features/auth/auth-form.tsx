"use client";

import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FormErrorSummary } from "@/components/feedback/form-error-summary";
import { useOnlineStatus } from "@/components/feedback/use-online-status";
import type { AuthActionState } from "./state";
import { initialAuthState } from "./state";

type AuthAction = (
  state: AuthActionState,
  formData: FormData,
) => Promise<AuthActionState>;

type AuthFormProps = {
  action: AuthAction;
  kind: "login" | "register" | "forgotPassword" | "resetPassword";
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const online = useOnlineStatus();

  return (
    <button
      type="submit"
      disabled={pending || !online}
      aria-busy={pending}
      className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-pitch px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,163,49,0.18)] transition hover:bg-[#008f2b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch disabled:cursor-wait disabled:opacity-65"
    >
      {pending ? `${label}…` : label}
    </button>
  );
}

function Field({
  id,
  name,
  type,
  label,
  autoComplete,
  error,
}: {
  id: string;
  name: "email" | "password" | "confirmPassword";
  type: "email" | "password";
  label: string;
  autoComplete: string;
  error?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="min-h-12 w-full rounded-xl border border-line bg-white px-4 text-base text-ink outline-none transition placeholder:text-muted/60 focus:border-pitch focus:ring-3 focus:ring-pitch/10 aria-invalid:border-red-600"
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthForm({ action, kind }: AuthFormProps) {
  const t = useTranslations("Auth");
  const [state, formAction] = useActionState(action, initialAuthState);
  const formId = useId();
  const showEmail = kind !== "resetPassword";
  const showPassword = kind !== "forgotPassword";
  const showConfirmation = kind === "register" || kind === "resetPassword";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === "error" ? (
        <FormErrorSummary message={state.message} />
      ) : state.message ? (
        <div
          role="status"
          className="rounded-xl border border-pitch/25 bg-pitch/8 px-4 py-3 text-sm leading-6 text-ink"
        >
          {state.message}
        </div>
      ) : null}

      {showEmail ? (
        <Field
          id={`${formId}-email`}
          name="email"
          type="email"
          label={t("fields.email")}
          autoComplete="email"
          error={state.fieldErrors?.email}
        />
      ) : null}

      {showPassword ? (
        <Field
          id={`${formId}-password`}
          name="password"
          type="password"
          label={
            kind === "resetPassword"
              ? t("fields.newPassword")
              : t("fields.password")
          }
          autoComplete={kind === "login" ? "current-password" : "new-password"}
          error={state.fieldErrors?.password}
        />
      ) : null}

      {showConfirmation ? (
        <Field
          id={`${formId}-confirm-password`}
          name="confirmPassword"
          type="password"
          label={t("fields.confirmPassword")}
          autoComplete="new-password"
          error={state.fieldErrors?.confirmPassword}
        />
      ) : null}

      {kind === "login" ? (
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-bold text-pitch underline-offset-4 hover:underline"
          >
            {t("login.forgotLink")}
          </Link>
        </div>
      ) : null}

      <SubmitButton label={t(`${kind}.submit`)} />
    </form>
  );
}
