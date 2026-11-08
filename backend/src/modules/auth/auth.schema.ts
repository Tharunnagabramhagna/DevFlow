import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long').trim(),
  role: z.enum(['FREELANCER', 'CLIENT']).default('FREELANCER'),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const OAuthExchangeSchema = z.object({
  code: z.string().min(1, 'OAuth exchange code is required'),
});

export type OAuthExchangeDto = z.infer<typeof OAuthExchangeSchema>;

export const AccountLinkingPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type AccountLinkingPasswordDto = z.infer<typeof AccountLinkingPasswordSchema>;

export const AccountLinkingOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export type AccountLinkingOtpDto = z.infer<typeof AccountLinkingOtpSchema>;

export const SocialOAuthInitiateSchema = z.object({
  role: z.enum(['FREELANCER', 'CLIENT']).default('FREELANCER'),
  intent: z.enum(['login', 'signup']).default('login'),
  callbackUrl: z.string().url().optional(),
});

export type SocialOAuthInitiateDto = z.infer<typeof SocialOAuthInitiateSchema>;

export const MockSocialAuthSchema = z.object({
  provider: z.enum(['google', 'facebook']),
  email: z.string().email('Invalid email address format').toLowerCase().trim(),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['FREELANCER', 'CLIENT']),
  avatarUrl: z.string().url().optional(),
});

export type MockSocialAuthDto = z.infer<typeof MockSocialAuthSchema>;


