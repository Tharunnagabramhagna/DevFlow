import { z } from 'zod';
import { Role } from '@prisma/client';

const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/]).{8,}$/;

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      passwordComplexityRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  name: z.string().min(2, 'Name must be at least 2 characters long').trim(),
  role: z.nativeEnum(Role).optional().default(Role.FREELANCER).refine(
    (role) => role !== Role.ADMIN,
    { message: 'Cannot self-register as ADMIN' }
  ),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      passwordComplexityRegex,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

export const OAuthExchangeSchema = z.object({
  code: z.string().min(1, 'Exchange code is required'),
});

export const GitHubCallbackQuerySchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
});

export const AccountLinkingPasswordSchema = z.object({
  ticket: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
});

export const AccountLinkingOtpSchema = z.object({
  ticket: z.string().optional(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type OAuthExchangeDto = z.infer<typeof OAuthExchangeSchema>;
export type GitHubCallbackQueryDto = z.infer<typeof GitHubCallbackQuerySchema>;
export type AccountLinkingPasswordDto = z.infer<typeof AccountLinkingPasswordSchema>;
export type AccountLinkingOtpDto = z.infer<typeof AccountLinkingOtpSchema>;
