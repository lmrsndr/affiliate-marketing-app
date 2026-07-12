const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "");
const SESSION_KEY = "bundlebee.supabase.session";

function assertConfigured() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase authentication is not configured for this deployment.");
  }
}

function decodeJwt(token) {
  try {
    const payload = String(token || "").split(".")[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return {};
  }
}

function readStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function normaliseSession(data) {
  if (!data?.access_token) return null;
  const claims = decodeJwt(data.access_token);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || readStoredSession()?.refresh_token || "",
    token_type: data.token_type || "bearer",
    expires_in: Number(data.expires_in || 3600),
    expires_at: Number(data.expires_at || claims.exp || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)),
    user: data.user || null,
  };
}

function saveSession(data) {
  const session = normaliseSession(data);
  if (!session) return null;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSupabaseSession() {
  localStorage.removeItem(SESSION_KEY);
}

async function authRequest(path, { method = "GET", token = "", body } = {}) {
  assertConfigured();
  const response = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token || SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(data?.msg || data?.message || data?.error_description || data?.error || `Authentication failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function signInWithPassword(email, password) {
  const data = await authRequest("/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  return saveSession(data);
}

export async function refreshSupabaseSession() {
  const current = readStoredSession();
  if (!current?.refresh_token) {
    clearSupabaseSession();
    return null;
  }

  try {
    const data = await authRequest("/token?grant_type=refresh_token", {
      method: "POST",
      body: { refresh_token: current.refresh_token },
    });
    return saveSession(data);
  } catch (error) {
    clearSupabaseSession();
    throw error;
  }
}

export async function getSupabaseSession({ refresh = true } = {}) {
  let session = readStoredSession();
  if (!session?.access_token) return null;

  const expiresSoon = Number(session.expires_at || 0) <= Math.floor(Date.now() / 1000) + 60;
  if (refresh && expiresSoon) session = await refreshSupabaseSession();
  return session;
}

export async function getSupabaseAccessToken() {
  return (await getSupabaseSession())?.access_token || "";
}

export async function getSupabaseUser() {
  const session = await getSupabaseSession();
  if (!session?.access_token) return null;
  const user = await authRequest("/user", { token: session.access_token });
  session.user = user;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return user;
}

export async function signOutSupabase() {
  const session = readStoredSession();
  try {
    if (session?.access_token) {
      await authRequest("/logout", { method: "POST", token: session.access_token });
    }
  } finally {
    clearSupabaseSession();
  }
}

export async function enrollTotp(friendlyName = "BundleBee administrator") {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Sign in again before setting up MFA.");
  return authRequest("/factors", {
    method: "POST",
    token,
    body: { factor_type: "totp", friendly_name: friendlyName },
  });
}

export async function challengeTotp(factorId) {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Sign in again before verifying MFA.");
  return authRequest(`/factors/${encodeURIComponent(factorId)}/challenge`, {
    method: "POST",
    token,
    body: {},
  });
}

export async function verifyTotp(factorId, challengeId, code) {
  const token = await getSupabaseAccessToken();
  if (!token) throw new Error("Sign in again before verifying MFA.");
  const data = await authRequest(`/factors/${encodeURIComponent(factorId)}/verify`, {
    method: "POST",
    token,
    body: { challenge_id: challengeId, code },
  });

  if (data?.access_token) saveSession(data);
  return data;
}

export async function challengeAndVerifyTotp(factorId, code) {
  const challenge = await challengeTotp(factorId);
  return verifyTotp(factorId, challenge.id, code);
}

export function sessionClaims(session = readStoredSession()) {
  return decodeJwt(session?.access_token || "");
}

export function hasSupabaseConfiguration() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}
