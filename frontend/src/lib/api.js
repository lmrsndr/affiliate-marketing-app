/**
 * One source of truth for API base + credentialed requests.
 * You can override with VITE_API_URL (no trailing /api).
 */
const RAW_BASE =
  (typeof window !== 'undefined' && window.__BB_API_BASE) ||
  import.meta.env?.VITE_API_URL ||
  'https://api.bundlebee.co.uk';

export const API_BASE = RAW_BASE.replace(/\/+$/,'') + '/api';

export function apiFetch(path, opts = {}) {
  const url = API_BASE + path;
  const init = { credentials: 'include', ...opts };
  return fetch(url, init);
}
