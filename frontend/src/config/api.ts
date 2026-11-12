/**
 * DevFlow API Configuration
 *
 * Supports environment-based base URL for production deployments (e.g. Vercel)
 * and local relative /api proxy fallback for development.
 *
 * In Production on Vercel:
 * Set VITE_API_BASE_URL=https://your-backend-api.com
 *
 * In Local Development:
 * Omit VITE_API_BASE_URL to use Vite's local proxy to http://localhost:3001
 */

function resolveApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl) {
    // In local development, relative /api is forwarded by Vite dev server proxy
    return '/api';
  }
  // Strip trailing slash if present
  const trimmed = envUrl.replace(/\/+$/, '');
  // If the URL already ends with /api, use as-is; otherwise append /api
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Returns true if an external production API URL is explicitly configured
 */
export const isProductionApiConfigured = (): boolean => {
  return Boolean(import.meta.env.VITE_API_BASE_URL?.trim());
};

export default API_BASE_URL;
