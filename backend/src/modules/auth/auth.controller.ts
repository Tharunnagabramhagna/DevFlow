import { Request, Response, NextFunction, CookieOptions } from 'express';
import { env } from '../../config/env';
import { authService } from './auth.service';

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
      const { code, state } = req.query as { code: string; state: string };
      const rawCookieState = req.cookies.devflow_oauth_state;

      // Clear state cookie
      res.clearCookie('devflow_oauth_state', { path: '/' });

      const result = await authService.handleGitHubCallback(code, state, rawCookieState);

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
}

export const authController = new AuthController();
