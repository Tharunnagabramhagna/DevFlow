import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ForbiddenError } from '../utils/errors';

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

  // Extract expected origin URL base
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(env.CLIENT_URL).origin;
  } catch {
    expectedOrigin = env.CLIENT_URL;
  }

  // 1. Validate Origin header if present
  if (origin) {
    let requestOrigin: string;
    try {
      requestOrigin = new URL(origin).origin;
    } catch {
      requestOrigin = origin;
    }

    if (requestOrigin !== expectedOrigin) {
      throw new ForbiddenError(
        'Request origin header does not match authorized client URL',
        undefined,
        'CSRF_ORIGIN_MISMATCH'
      );
    }
  } else if (referer) {
    // 2. Fall back to Referer validation if Origin is omitted
    let refererOrigin: string;
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      refererOrigin = referer;
    }

    if (refererOrigin !== expectedOrigin) {
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

