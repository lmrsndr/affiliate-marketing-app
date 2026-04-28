/**
 * One source of truth for API base + credentialed requests.
 * You can override with VITE_API_URL. It may include or omit the trailing /api.
 */
const RAW_BASE =
  (typeof window !== 'undefined' && window.__BB_API_BASE) ||
  import.meta.env?.VITE_API_URL ||
  'http://localhost:5000/api';

const NORMALIZED_BASE = RAW_BASE.replace(/\/+$/,'');
export const API_BASE = NORMALIZED_BASE.endsWith('/api')
  ? NORMALIZED_BASE
  : NORMALIZED_BASE + '/api';

export function apiFetch(path, opts = {}) {
  const url = API_BASE + path;
  const init = { credentials: 'include', ...opts };
  return fetch(url, init);
}
