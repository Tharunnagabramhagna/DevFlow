import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ForbiddenError } from '../utils/errors';

/**
 * Returns whether a candidate Origin/Referer matches the configured CLIENT_URL,
 * allowing localhost <-> 127.0.0.1 loopback equivalents on the same protocol/port in non-production.
 */
export function isTrustedClientOrigin(candidateUrl: string): boolean {
  let expectedUrl: URL;
  try {
    expectedUrl = new URL(env.CLIENT_URL);
  } catch {
    return candidateUrl === env.CLIENT_URL;
  }

  let parsedCandidate: URL;
  try {
    parsedCandidate = new URL(candidateUrl);
  } catch {
    return false;
  }

  if (parsedCandidate.origin === expectedUrl.origin) {
    return true;
  }

  if (env.NODE_ENV !== 'production') {
    const isLoopback = (host: string) => host === 'localhost' || host === '127.0.0.1';
    if (
      isLoopback(expectedUrl.hostname) &&
      isLoopback(parsedCandidate.hostname) &&
      parsedCandidate.protocol === expectedUrl.protocol &&
      parsedCandidate.port === expectedUrl.port
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Validates Origin/Referer and custom headers on cookie-authenticated state-changing endpoints.
 * Protects against Cross-Site Request Forgery (CSRF).
 */
export const validateTrustedOrigin = (req: Request, _res: Response, next: NextFunction): void => {
  // Safe HTTP methods do not change state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // 1. Validate Origin header if present
  if (origin) {
    if (!isTrustedClientOrigin(origin)) {
      throw new ForbiddenError(
        'Request origin header does not match authorized client URL',
        undefined,
        'CSRF_ORIGIN_MISMATCH'
      );
    }
  } else if (referer) {
    // 2. Fall back to Referer validation if Origin is omitted
    if (!isTrustedClientOrigin(referer)) {
      throw new ForbiddenError(
        'Request referer header does not match authorized client URL',
        undefined,
        'CSRF_REFERER_MISMATCH'
      );
    }
  } else if (env.NODE_ENV === 'production') {
    // In production, mutating requests relying on cookies must include Origin or Referer
    throw new ForbiddenError(
      'Missing required Origin or Referer header on state-changing request',
      undefined,
      'CSRF_MISSING_ORIGIN'
    );
  }

  // 3. Verify presence of custom requested-with header (prevents simple cross-site HTML form submits)
  const requestedWith = req.headers['x-requested-with'];
  const secFetchSite = req.headers['sec-fetch-site'];

  // Accept if X-Requested-With is present or Sec-Fetch-Site indicates same-origin / same-site
  const isCustomHeaderPresent = requestedWith === 'XMLHttpRequest';
  const isSafeFetchSite = secFetchSite === 'same-origin' || secFetchSite === 'same-site';

  if (!isCustomHeaderPresent && !isSafeFetchSite && env.NODE_ENV === 'production') {
    throw new ForbiddenError(
      'Missing or invalid X-Requested-With header on cookie-authenticated request',
      undefined,
      'CSRF_HEADER_MISSING'
    );
  }

  next();
};

