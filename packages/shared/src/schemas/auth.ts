import { z } from 'zod';

/**
 * Auth API request/response shapes shared between the web app and any future
 * native client (iOS). Cognito does the actual identity work; these are the
 * shapes our own /api/auth/* endpoints accept and return.
 */

// Cognito's password policy by default: min 8 chars, requires upper/lower/digit/symbol.
// We mirror the minimum bar here so the client can give faster feedback than waiting
// for Cognito's InvalidPasswordException; Cognito still has the final say.
const PasswordSchema = z.string().min(8).max(256);
const EmailSchema = z.string().email().max(254);

export const SignInInputSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
export type SignInInput = z.infer<typeof SignInInputSchema>;

export const SignUpInputSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export const SignUpResponseSchema = z.object({
  email: z.string().email(),
  // Cognito returns userConfirmed=false for unverified emails; we surface that
  // so the UI knows to send the user to the /confirm page.
  requiresConfirmation: z.boolean(),
});
export type SignUpResponse = z.infer<typeof SignUpResponseSchema>;

export const ConfirmInputSchema = z.object({
  email: EmailSchema,
  // Cognito's default confirmation codes are 6 numeric digits.
  code: z.string().regex(/^\d{6}$/),
});
export type ConfirmInput = z.infer<typeof ConfirmInputSchema>;

export const ResendConfirmationInputSchema = z.object({
  email: EmailSchema,
});
export type ResendConfirmationInput = z.infer<typeof ResendConfirmationInputSchema>;

/**
 * Generic shape for error responses from any /api/auth/* route. `code` is a
 * stable machine-readable identifier (often the Cognito error name lower-cased)
 * so the UI can decide whether to redirect (e.g. UserNotConfirmedException
 * sends to /confirm) without parsing message strings.
 */
export const AuthErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type AuthErrorResponse = z.infer<typeof AuthErrorResponseSchema>;
