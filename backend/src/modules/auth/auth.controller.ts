import { Request, Response, NextFunction, CookieOptions } from 'express';
import { env } from '../../config/env';
import { authService } from './auth.service';

const getRefreshTokenCookieName = (): string => {
  return env.NODE_ENV === 'production' ? '__Host-devflow_refresh_token' : 'devflow_refresh_token';
};

const getRefreshCookieOptions = (): CookieOptions => {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/api/auth',
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

      const { accessToken, rawRefreshToken, isGraceReplay } = await authService.rotateRefreshToken(rawToken);

      if (rawRefreshToken && !isGraceReplay) {
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

      res.clearCookie(cookieName, { path: '/api/auth' });
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

      res.clearCookie('devflow_linking_challenge', { path: '/api/auth' });
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

      res.clearCookie('devflow_linking_challenge', { path: '/api/auth' });
      res.cookie(getRefreshTokenCookieName(), rawRefreshToken, getRefreshCookieOptions());
      res.status(200).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();

