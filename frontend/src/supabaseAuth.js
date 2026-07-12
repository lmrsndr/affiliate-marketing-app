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

function saveSession(data) {
  if (!data?.access_token) return null;
  const claims = decodeJwt(data.access_token);
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || readStoredSession()?.refresh_token || "",
    token_type: data.token_type || "bearer",
    expires_in: Number(data.expires_in || 3600),
    expires_at: Number(data.expires_at || claims.exp || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)),
    user: data.user || null,
  };
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
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.msg || data?.message || data?.error_description || data?.error || `Authentication failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function sendMagicLink(email) {
  const redirectTo = `${window.location.origin}/auth/callback`;
  await authRequest(`/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    body: {
      email: String(email || "").trim().toLowerCase(),
      create_user: false,
    },
  });
}

export function consumeMagicLinkFromUrl() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const errorMessage = hash.get("error_description") || hash.get("error");
  if (errorMessage) throw new Error(errorMessage);

  const accessToken = hash.get("access_token");
  if (!accessToken) return null;

  const session = saveSession({
    access_token: accessToken,
    refresh_token: hash.get("refresh_token") || "",
    token_type: hash.get("token_type") || "bearer",
    expires_in: Number(hash.get("expires_in") || 3600),
  });
  window.history.replaceState({}, document.title, window.location.pathname);
  return session;
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

export async function signOutSupabase() {
  const session = readStoredSession();
  try {
    if (session?.access_token) await authRequest("/logout", { method: "POST", token: session.access_token });
  } finally {
    clearSupabaseSession();
  }
}

export function hasSupabaseConfiguration() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}
