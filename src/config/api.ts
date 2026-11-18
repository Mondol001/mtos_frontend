/**
 * Centralized API configuration for Mondol Telecom Online Services.
 * Reads VITE_API_BASE_URL from environment variables.
 * In production (Vercel frontend deployment), this points to the Railway backend domain.
 */

const getApiBaseUrl = (): string => {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw && typeof raw === 'string') {
    return raw.trim().replace(/\/+$/, '');
  }
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
