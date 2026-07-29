"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { z } from "zod";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { getAppUrl, isAppLocale, safeInternalPath } from "@/lib/auth/urls";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type AuthField,
} from "./schemas";
import type { AuthActionState } from "./state";

function localeOrDefault(locale: string): AppLocale {
  return isAppLocale(locale) ? locale : routing.defaultLocale;
}

async function validationState(
  locale: AppLocale,
  error: z.ZodError,
): Promise<AuthActionState> {
  const t = await getTranslations({ locale, namespace: "Auth.validation" });
  const fieldErrors: Partial<Record<AuthField, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      (field === "email" ||
        field === "password" ||
        field === "confirmPassword") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = t(issue.message);
    }
  }

  return { status: "error", fieldErrors };
}

function authErrorKey(code?: string) {
  switch (code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "user_already_exists":
    case "email_exists":
      return "accountExists";
    case "weak_password":
      return "weakPassword";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "rateLimited";
    default:
      return "unexpected";
  }
}

export async function loginAction(
  localeInput: string,
  nextInput: string,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = localeOrDefault(localeInput);
  const result = loginSchema.safeParse({
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  });

  if (!result.success) return validationState(locale, result.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    const t = await getTranslations({ locale, namespace: "Auth.errors" });
    return { status: "error", message: t(authErrorKey(error.code)) };
  }

  redirect(safeInternalPath(nextInput, `/${locale}/dashboard`));
}

export async function registerAction(
  localeInput: string,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = localeOrDefault(localeInput);
  const result = registerSchema.safeParse({
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
  });

  if (!result.success) return validationState(locale, result.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      emailRedirectTo: getAppUrl(
        `/${locale}/auth/callback?next=${encodeURIComponent(`/${locale}/dashboard`)}`,
      ),
    },
  });

  if (error) {
    const t = await getTranslations({ locale, namespace: "Auth.errors" });
    return { status: "error", message: t(authErrorKey(error.code)) };
  }

  if (data.session) redirect(`/${locale}/dashboard`);

  const t = await getTranslations({ locale, namespace: "Auth.register" });
  return { status: "success", message: t("checkEmail") };
}

export async function forgotPasswordAction(
  localeInput: string,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = localeOrDefault(localeInput);
  const result = forgotPasswordSchema.safeParse({
    email: formData.get("email")?.toString() ?? "",
  });

  if (!result.success) return validationState(locale, result.error);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(result.data.email, {
    redirectTo: getAppUrl(
      `/${locale}/auth/callback?next=${encodeURIComponent(`/${locale}/reset-password`)}`,
    ),
  });

  const t = await getTranslations({
    locale,
    namespace: "Auth.forgotPassword",
  });
  return { status: "success", message: t("confirmation") };
}

export async function resetPasswordAction(
  localeInput: string,
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = localeOrDefault(localeInput);
  const result = resetPasswordSchema.safeParse({
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
  });

  if (!result.success) return validationState(locale, result.error);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations({ locale, namespace: "Auth.errors" });

  if (!user) return { status: "error", message: t("expiredResetLink") };

  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  });

  if (error) {
    return { status: "error", message: t(authErrorKey(error.code)) };
  }

  await supabase.auth.signOut();
  redirect(`/${locale}/login?notice=password-updated`);
}

export async function logoutAction(localeInput: string) {
  const locale = localeOrDefault(localeInput);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
