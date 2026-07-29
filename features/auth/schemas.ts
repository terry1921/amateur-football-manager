import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

const emailSchema = z
  .string()
  .trim()
  .min(1, "required")
  .email("invalidEmail")
  .transform((email) => email.toLowerCase());

const passwordSchema = z
  .string()
  .min(1, "required")
  .min(MIN_PASSWORD_LENGTH, "weakPassword");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "required"),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "required"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordMismatch",
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "required"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordMismatch",
  });

export type AuthField = "email" | "password" | "confirmPassword";
