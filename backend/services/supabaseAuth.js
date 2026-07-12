const runtime = require("../config/runtime");
const LegacyUser = require("../models/User");

function authHeaders(token, { admin = false } = {}) {
  const key = admin ? runtime.supabaseSecretKey : runtime.supabasePublishableKey;
  return {
    apikey: key,
    Authorization: `Bearer ${token || key}`,
    "Content-Type": "application/json",
  };
}

async function supabaseRequest(path, { method = "GET", token = "", body, admin = false } = {}) {
  const response = await fetch(`${runtime.supabaseUrl}/auth/v1${path}`, {
    method,
    headers: authHeaders(token, { admin }),
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
    const error = new Error(data?.msg || data?.message || data?.error_description || `Supabase request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function decodeJwtPayload(token) {
  try {
    const payload = String(token || "").split(".")[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return {};
  }
}

async function updateSupabaseUser(userId, updates) {
  return supabaseRequest(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    admin: true,
    body: updates,
  });
}

async function ensureAdminRole(user) {
  if (user?.app_metadata?.role === "admin") return user;

  const email = String(user?.email || "").trim().toLowerCase();
  if (!email) return user;

  const legacyAdmin = await LegacyUser.findOne({
    email,
    role: "admin",
    suspended: { $ne: true },
  }).select("email name");

  if (!legacyAdmin) return user;

  return updateSupabaseUser(user.id, {
    app_metadata: {
      ...(user.app_metadata || {}),
      role: "admin",
      migrated_from_bundlebee: true,
    },
    user_metadata: {
      ...(user.user_metadata || {}),
      name: user.user_metadata?.name || legacyAdmin.name || email.split("@")[0],
    },
  });
}

async function authenticateAccessToken(accessToken) {
  if (!accessToken) {
    const error = new Error("Missing Supabase access token");
    error.status = 401;
    throw error;
  }

  let user = await supabaseRequest("/user", { token: accessToken });
  user = await ensureAdminRole(user);
  const claims = decodeJwtPayload(accessToken);

  return {
    user,
    claims,
    aal: claims.aal || "aal1",
    role: user?.app_metadata?.role || "user",
  };
}

async function listAdminUsers(page = 1, perPage = 100) {
  return supabaseRequest(`/admin/users?page=${page}&per_page=${perPage}`, { admin: true });
}

async function createAdminUser({ email, password, name }) {
  return supabaseRequest("/admin/users", {
    method: "POST",
    admin: true,
    body: {
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
      user_metadata: { name },
    },
  });
}

async function deleteSupabaseUser(userId) {
  return supabaseRequest(`/admin/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    admin: true,
  });
}

async function listUserFactors(userId) {
  return supabaseRequest(`/admin/users/${encodeURIComponent(userId)}/factors`, { admin: true });
}

async function deleteUserFactor(userId, factorId) {
  return supabaseRequest(`/admin/users/${encodeURIComponent(userId)}/factors/${encodeURIComponent(factorId)}`, {
    method: "DELETE",
    admin: true,
  });
}

module.exports = {
  authenticateAccessToken,
  createAdminUser,
  decodeJwtPayload,
  deleteSupabaseUser,
  deleteUserFactor,
  listAdminUsers,
  listUserFactors,
  supabaseRequest,
  updateSupabaseUser,
};
