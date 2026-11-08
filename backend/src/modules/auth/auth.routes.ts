import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody, validateQuery } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { validateTrustedOrigin } from '../../middleware/csrf';
import { loginRateLimiter, passwordResetRateLimiter } from '../../middleware/rateLimiter';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  OAuthExchangeSchema,
  GitHubCallbackQuerySchema,
  AccountLinkingPasswordSchema,
  AccountLinkingOtpSchema,
} from './auth.schema';

export const authRouter = Router();

// Standard Password & Session Lifecycle
authRouter.post('/register', validateBody(RegisterSchema), (req, res, next) => authController.register(req, res, next));
authRouter.post('/login', loginRateLimiter, validateBody(LoginSchema), (req, res, next) => authController.login(req, res, next));
authRouter.post('/refresh', validateTrustedOrigin, (req, res, next) => authController.refresh(req, res, next));
authRouter.post('/logout', validateTrustedOrigin, (req, res, next) => authController.logout(req, res, next));
authRouter.get('/me', authenticate, (req, res) => authController.getMe(req, res));

// Password Reset Flow
authRouter.post('/forgot-password', passwordResetRateLimiter, validateBody(ForgotPasswordSchema), (req, res, next) => authController.forgotPassword(req, res, next));
authRouter.post('/reset-password', validateBody(ResetPasswordSchema), (req, res, next) => authController.resetPassword(req, res, next));

// GitHub OAuth 2.0 Flow
authRouter.get('/github', (req, res, next) => authController.initiateGitHubOAuth(req, res, next));
authRouter.get('/github/callback', validateQuery(GitHubCallbackQuerySchema), (req, res, next) => authController.handleGitHubCallback(req, res, next));

// Google & Facebook Social OAuth 2.0
authRouter.get('/oauth/providers', (req, res) => authController.getOAuthProviders(req, res));
authRouter.get('/oauth/google', (req, res, next) => authController.initiateGoogleOAuth(req, res, next));
authRouter.post('/oauth/google/initiate', (req, res, next) => authController.initiateGoogleOAuth(req, res, next));
authRouter.get('/oauth/google/callback', (req, res) => authController.handleGoogleOAuthCallback(req, res));
authRouter.get('/oauth/facebook', (req, res, next) => authController.initiateFacebookOAuth(req, res, next));
authRouter.post('/oauth/facebook/initiate', (req, res, next) => authController.initiateFacebookOAuth(req, res, next));
authRouter.get('/oauth/facebook/callback', (req, res) => authController.handleFacebookOAuthCallback(req, res));
authRouter.post('/oauth/mock', (req, res, next) => authController.mockSocialAuth(req, res, next));

// OAuth Exchange & Account Linking Flow
authRouter.post('/oauth/exchange', validateBody(OAuthExchangeSchema), (req, res, next) => authController.exchangeOAuthCode(req, res, next));
authRouter.get('/oauth/link-account/status', (req, res, next) => authController.getAccountLinkingStatus(req, res, next));
authRouter.post('/oauth/link-account/verify-password', validateTrustedOrigin, validateBody(AccountLinkingPasswordSchema), (req, res, next) => authController.verifyAccountLinkingPassword(req, res, next));
authRouter.post('/oauth/link-account/send-otp', validateTrustedOrigin, (req, res, next) => authController.sendAccountLinkingOtp(req, res, next));
authRouter.post('/oauth/link-account/verify-otp', validateTrustedOrigin, validateBody(AccountLinkingOtpSchema), (req, res, next) => authController.verifyAccountLinkingOtp(req, res, next));

export default authRouter;
