import { apiFetch } from './api';

export async function fetchAuthStatus() {
  try {
    const res = await apiFetch('/auth/status');
    if (!res.ok) return { ok: false };
    return await res.json();
  } catch {
    return { ok: false };
  }
}

/**
 * Decide where to send the user based on server truth.
 * server returns: { ok:true, user, mfaVerified, ... }
 */
export async function decideNext() {
  const s = await fetchAuthStatus();
  if (!s?.ok) return { ok:false, next:'login' };
  if (!s.user)  return { ok:true, next:'login' };
  if (s.mfaVerified) return { ok:true, next:'dashboard', user:s.user };
  return { ok:true, next:'verify-2fa', user:s.user };
}
