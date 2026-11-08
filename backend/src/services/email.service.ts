import { env } from '../config/env';
import logger from '../utils/logger';

export interface IEmailService {
  sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
  sendAccountLinkingOtp(email: string, otp: string): Promise<void>;
}

export class EmailService implements IEmailService {
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

    logger.info('Password reset dispatch triggered', {
      recipient: email,
      action: 'PASSWORD_RESET',
      environment: env.NODE_ENV,
    });

    if (env.NODE_ENV !== 'production') {
      // In development and test environments, log the reset URL for developer testing
      logger.info(`[Dev/Test Mailer] Password reset link for ${email}: ${resetUrl}`, {
        resetUrl,
      });
    }

    // In production with configured SMTP, real mail dispatch can be added here
  }

  async sendAccountLinkingOtp(email: string, otp: string): Promise<void> {
    logger.info('Account linking OTP dispatch triggered', {
      recipient: email,
      action: 'ACCOUNT_LINKING_OTP',
      environment: env.NODE_ENV,
    });

    if (env.NODE_ENV !== 'production') {
      logger.info(`[Dev/Test Mailer] Account linking verification code for ${email}: ${otp}`);
    }
  }
}

export const emailService = new EmailService();

