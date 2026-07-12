const runtime = require("../config/runtime");

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

function isApprovedAdminEmail(email) {
  return runtime.adminEmails.has(String(email || "").trim().toLowerCase());
}

async function authenticateAccessToken(accessToken) {
  if (!accessToken) {
    const error = new Error("Missing Supabase access token");
    error.status = 401;
    throw error;
  }

  const user = await supabaseRequest("/user", { token: accessToken });
  const approved = isApprovedAdminEmail(user?.email);

  if (!approved) {
    const error = new Error("This email is not approved for BundleBee administration");
    error.status = 403;
    throw error;
  }

  return {
    user,
    role: "admin",
  };
}

async function listAdminUsers(page = 1, perPage = 100) {
  const result = await supabaseRequest(`/admin/users?page=${page}&per_page=${perPage}`, { admin: true });
  const users = Array.isArray(result?.users) ? result.users : [];
  return {
    ...result,
    users: users.filter((user) => isApprovedAdminEmail(user.email)),
  };
}

module.exports = {
  authenticateAccessToken,
  isApprovedAdminEmail,
  listAdminUsers,
  supabaseRequest,
};
