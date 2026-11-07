import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Computes SHA-256 hex digest of a raw token or secret.
 */
export const hashToken = (rawToken: string): string => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

/**
 * Resolves a 32-byte Buffer for AES-256 encryption.
 */
const getEncryptionKeyBuffer = (keyHex?: string): Buffer => {
  const candidate = keyHex || env.ENCRYPTION_KEY;
  if (candidate && /^[0-9a-fA-F]{64}$/.test(candidate)) {
    return Buffer.from(candidate, 'hex');
  }
  // Fallback: derive 32-byte key from JWT_SECRET using SHA-256
  return crypto.createHash('sha256').update(env.JWT_SECRET).digest();
};

/**
 * Authenticated AES-256-GCM encryption with 12-byte random IV and 16-byte auth tag.
 * Returns formatted string: `${ivHex}:${authTagHex}:${encryptedHex}`
 */
export const encryptSecret = (plainText: string, keyHex?: string): string => {
  const key = getEncryptionKeyBuffer(keyHex);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Authenticated AES-256-GCM decryption.
 */
export const decryptSecret = (cipherText: string, keyHex?: string): string => {
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid cipherText format for AES-256-GCM decryption');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKeyBuffer(keyHex);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

/**
 * Generates a cryptographically secure random hexadecimal string.
 */
export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generates a 6-digit numeric OTP and its SHA-256 hash.
 */
export const generateOtp = (): { otp: string; otpHash: string } => {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashToken(otp);
  return { otp, otpHash };
};

