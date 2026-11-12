import { Request, Response, NextFunction, CookieOptions } from 'express';
import { env } from '../../config/env';
import { authService } from './auth.service';
import { ForbiddenError } from '../../utils/errors';

const getRefreshTokenCookieName = (): string => {
  const isProd = env.NODE_ENV === 'production';
  // __Host- requires Secure=true and Path=/ without Domain
  return isProd && env.REFRESH_COOKIE_SAME_SITE !== 'none'
    ? '__Host-devflow_refresh_token'
    : 'devflow_refresh_token';
};

const getRefreshCookieOptions = (): CookieOptions => {
  const isProd = env.NODE_ENV === 'production';
  const isNone = env.REFRESH_COOKIE_SAME_SITE === 'none';

  return {
    httpOnly: true,
    secure: isProd || isNone,
    sameSite: env.REFRESH_COOKIE_SAME_SITE,
    path: '/', // Mandatory for RFC 6265bis __Host- cookies
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, rawRefreshToken } = await authService.register(req.body);

      res.cookie(getRefreshTokenCookieName(), rawRefreshToken, getRefreshCookieOptions());
      res.status(201).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, rawRefreshToken } = await authService.login(req.body);

      res.cookie(getRefreshTokenCookieName(), rawRefreshToken, getRefreshCookieOptions());
      res.status(200).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  }

  async guestLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const persona = req.body?.persona === 'CLIENT' ? 'CLIENT' : req.body?.persona === 'DEVELOPER' ? 'DEVELOPER' : undefined;
      const { user, accessToken } = await authService.createGuestSession(persona);
      res.status(200).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cookieName = getRefreshTokenCookieName();
      const rawToken = req.cookies[cookieName];

      const { accessToken, rawRefreshToken } = await authService.rotateRefreshToken(rawToken);

      if (rawRefreshToken) {
        res.cookie(cookieName, rawRefreshToken, getRefreshCookieOptions());
      }

      res.status(200).json({ accessToken });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cookieName = getRefreshTokenCookieName();
      const rawToken = req.cookies[cookieName];

      await authService.logout(rawToken);

      res.clearCookie(cookieName, {
        path: '/',
        httpOnly: true,
        secure: env.NODE_ENV === 'production' || env.REFRESH_COOKIE_SAME_SITE === 'none',
        sameSite: env.REFRESH_COOKIE_SAME_SITE,
      });

      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.requestPasswordReset(req.body.email);

      res.status(200).json({
        success: true,
        message: 'If an account matches that email address, a password reset link has been dispatched.',
        ...(env.NODE_ENV !== 'production' && result.resetToken ? { devResetToken: result.resetToken } : {}),
      });
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.resetPassword(req.body.token, req.body.newPassword);

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. Please sign in with your new credentials.',
      });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    res.status(200).json({ user: req.user });
  }

  async initiateGitHubOAuth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { authorizeUrl, rawState } = await authService.initiateGitHubOAuth();

      // State cookie MUST use SameSite=Lax to be sent on incoming top-level redirect from GitHub
      res.cookie('devflow_oauth_state', rawState, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60 * 1000, // 10 minutes
      });

      res.redirect(authorizeUrl);
    } catch (err) {
      next(err);
    }
  }

  async handleGitHubCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, state, error } = req.query as {
        code?: string;
        state?: string;
        error?: string;
      };
      const rawCookieState = req.cookies.devflow_oauth_state;

      // Clear state cookie
      res.clearCookie('devflow_oauth_state', { path: '/' });

      const result = await authService.handleGitHubCallback(code, state, rawCookieState, error);

      if (result.action === 'REDIRECT') {
        res.redirect(result.redirectUrl);
        return;
      }

      if (result.action === 'EXCHANGE') {
        res.redirect(`${env.CLIENT_URL}/oauth/callback?code=${result.code}`);
        return;
      }

      if (result.action === 'LINK_REQUIRED') {
        res.cookie('devflow_linking_challenge', result.ticket, {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.redirect(`${env.CLIENT_URL}/oauth/link-account?ticket=${result.ticket}`);
        return;
      }
    } catch (err) {
      next(err);
    }
  }

  async exchangeOAuthCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, rawRefreshToken } = await authService.exchangeOAuthCode(req.body.code);

      res.cookie(getRefreshTokenCookieName(), rawRefreshToken, getRefreshCookieOptions());
      res.status(200).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  }

  async getAccountLinkingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = req.cookies.devflow_linking_challenge || (req.query.ticket as string);
      const status = await authService.getAccountLinkingStatus(ticket);
      res.status(200).json(status);
    } catch (err) {
      next(err);
    }
  }

  async verifyAccountLinkingPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = req.cookies.devflow_linking_challenge || (req.body.ticket as string);
      const { user, accessToken, rawRefreshToken } = await authService.verifyAccountLinkingPassword(ticket, req.body.password);

      res.clearCookie('devflow_linking_challenge', { path: '/' });
      res.cookie(getRefreshTokenCookieName(), rawRefreshToken, getRefreshCookieOptions());
      res.status(200).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  }

  async sendAccountLinkingOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = req.cookies.devflow_linking_challenge || (req.body.ticket as string);
      const result = await authService.sendAccountLinkingOtp(ticket);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async verifyAccountLinkingOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = req.cookies.devflow_linking_challenge || (req.body.ticket as string);
      const { user, accessToken, rawRefreshToken } = await authService.verifyAccountLinkingOtp(ticket, req.body.otp);

      res.clearCookie('devflow_linking_challenge', { path: '/' });
      res.cookie(getRefreshTokenCookieName(), rawRefreshToken, getRefreshCookieOptions());
      res.status(200).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  }

  getOAuthProviders(_req: Request, res: Response): void {
    const status = authService.getOAuthProvidersStatus();
    res.status(200).json(status);
  }

  private async handleSocialInitiate(
    provider: 'google' | 'facebook',
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { role, intent, callbackUrl } = authService.normalizeSocialOAuthParams({
        role: req.body?.role ?? req.query?.role,
        intent: req.body?.intent ?? req.query?.intent,
        callbackUrl:
          req.body?.callbackUrl ?? (typeof req.query?.callbackUrl === 'string' ? req.query.callbackUrl : undefined),
      });

      const { authUrl, rawState } = await authService.initiateSocialOAuth({
        provider,
        role,
        intent,
        callbackUrl,
      });

      const isProd = env.NODE_ENV === 'production';
      res.cookie('devflow_oauth_state', rawState, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
        path: '/',
      });

      if (
        req.method === 'POST' ||
        req.headers.accept?.includes('application/json') ||
        req.body?.role ||
        req.query.json === 'true'
      ) {
        res.status(200).json({ authUrl });
      } else {
        res.redirect(authUrl);
      }
    } catch (err) {
      next(err);
    }
  }

  private async buildSocialFailureRedirect(state: string, message: string): Promise<string> {
    const clientBase = (env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const stateCtx = await authService.peekSocialOAuthStateContext(state);
    const baseRoute = stateCtx?.intent === 'signup' ? '/#/signup' : '/#/login';
    const rolePath =
      stateCtx?.role === 'CLIENT' ? '/client' : stateCtx?.role === 'FREELANCER' ? '/developer' : '';
    return `${clientBase}${baseRoute}${rolePath}?error=${encodeURIComponent(message)}`;
  }

  private async handleSocialCallback(
    provider: 'google' | 'facebook',
    req: Request,
    res: Response
  ): Promise<void> {
    const clientBase = (env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';

    try {
      if (req.query.error) {
        res.clearCookie('devflow_oauth_state', { path: '/' });
        const errorMsg =
          req.query.error_description || `${providerLabel} authentication was cancelled by user.`;
        const failUrl = await this.buildSocialFailureRedirect(state, String(errorMsg));
        return res.redirect(failUrl);
      }

      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const rawCookieState = req.cookies?.devflow_oauth_state;

      const { exchangeCode } =
        provider === 'google'
          ? await authService.handleGoogleOAuthCallback({
              code,
              state,
              rawCookieState,
            })
          : await authService.handleFacebookOAuthCallback({
              code,
              state,
              rawCookieState,
            });

      res.clearCookie('devflow_oauth_state', { path: '/' });
      res.redirect(`${clientBase}/#/oauth/callback?code=${encodeURIComponent(exchangeCode)}`);
    } catch (err: any) {
      res.clearCookie('devflow_oauth_state', { path: '/' });
      const failUrl = await this.buildSocialFailureRedirect(
        state,
        err?.message || `${providerLabel} authentication failed`
      );
      res.redirect(failUrl);
    }
  }

  async initiateGoogleOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    await this.handleSocialInitiate('google', req, res, next);
  }

  async handleGoogleOAuthCallback(req: Request, res: Response): Promise<void> {
    await this.handleSocialCallback('google', req, res);
  }

  async initiateFacebookOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    await this.handleSocialInitiate('facebook', req, res, next);
  }

  async handleFacebookOAuthCallback(req: Request, res: Response): Promise<void> {
    await this.handleSocialCallback('facebook', req, res);
  }

  async mockSocialAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (env.NODE_ENV === 'production') {
        throw new ForbiddenError(
          'Mock social authentication is disabled in production environments.',
          undefined,
          'MOCK_AUTH_DISABLED_IN_PRODUCTION'
        );
      }

      const { user, accessToken, rawRefreshToken } = await authService.mockSocialAuth({
        provider: req.body.provider,
        email: req.body.email,
        name: req.body.name,
        selectedRole: req.body.role,
        avatarUrl: req.body.avatarUrl,
      });

      res.cookie(getRefreshTokenCookieName(), rawRefreshToken, getRefreshCookieOptions());
      res.status(200).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
