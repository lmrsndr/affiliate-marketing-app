// Build tag for quick diagnostics
window.__BB_API_BUILD = "api.js unified 2025-09-11";
console.info("[BB] api.js loaded:", window.__BB_API_BUILD);

import axios from "axios";

/* ──────────────────────────────────────────────────────────────
   Base config
────────────────────────────────────────────────────────────── */
if (!import.meta.env.VITE_API_URL) {
  console.warn("⚠️ Missing VITE_API_URL in environment variables!");
}
// IMPORTANT: VITE_API_URL should point to your backend API root, e.g. https://api.bundlebee.co.uk/api
const safeBaseURL = (import.meta.env.VITE_API_URL || "https://api.bundlebee.co.uk/api").replace(/\/+$/, "");

const API = axios.create({
  baseURL: safeBaseURL,
  withCredentials: true, // <-- send/receive cookies
});
export default API;

/* ──────────────────────────────────────────────────────────────
   Token helpers (optional header token; server mainly uses cookies)
────────────────────────────────────────────────────────────── */
export function setAccessToken(token, { persist = "both" } = {}) {
  if (!token) {
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("accessToken");
    delete API.defaults.headers.common["Authorization"];
    return;
  }
  if (persist === "session" || persist === "both") sessionStorage.setItem("accessToken", token);
  if (persist === "local"   || persist === "both") localStorage.setItem("accessToken", token);
  API.defaults.headers.common["Authorization"] = "Bearer " + token;
}
function readAccessToken() {
  return sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken") || null;
}
function clearAccessToken() {
  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("accessToken");
  delete API.defaults.headers.common["Authorization"];
}

/* ──────────────────────────────────────────────────────────────
   Interceptors
   - We prefer cookie-based auth. If /auth/refresh sets cookies
     but does NOT return accessToken, we still retry the request.
────────────────────────────────────────────────────────────── */
API.interceptors.request.use(
  (config) => {
    if (!config.headers) config.headers = {};
    if (!config.headers.Authorization) {
      const token = readAccessToken();
      if (token) config.headers.Authorization = "Bearer " + token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const reason = error?.response?.data?.reason;
    const original = error?.config || {};
    const path = window.location.pathname;

    // 403 → MFA/TOTP routing (avoid loops)
    if (status === 403) {
      const onVerify = path === "/verify-2fa" || path === "/setup-2fa";
      if (reason === "MFA_REQUIRED" || reason === "EMAIL_2FA_REQUIRED" || reason === "TOTP_REQUIRED") {
        if (!onVerify) window.location.assign("/verify-2fa");
        return Promise.reject(error);
      }
      if (reason === "TOTP_REQUIRED_SETUP") {
        if (path !== "/setup-2fa") window.location.assign("/setup-2fa");
        return Promise.reject(error);
      }
    }

    // 401 → try cookie refresh once
    if (status === 401 && !original._retry) {
      if (isRefreshing) return Promise.reject(error);
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(safeBaseURL + "/auth/refresh", {}, { withCredentials: true });
        // If server returns a token, use it; if not, cookies were still refreshed—retry anyway
        if (data && data.accessToken) {
          setAccessToken(data.accessToken, { persist: "both" });
          original.headers = original.headers || {};
          original.headers.Authorization = "Bearer " + data.accessToken;
        }
        return API.request(original);
      } catch (_e) {
        clearAccessToken();
        const isPublic = ["/", "/login", "/register"].includes(window.location.pathname);
        if (!isPublic) window.location.assign("/login?reason=session-expired");
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/* ──────────────────────────────────────────────────────────────
   Auth navigation helper (used by OAuthCallback.vue)
────────────────────────────────────────────────────────────── */
export async function getNextAuthStep() {
  try {
    const { data } = await API.get("/auth/next");
    if (data && (data.step || data.next)) {
      // Support either { step } or { next }
      const step = data.step || data.next;
      if (step === "login")       return { step, redirectTo: "/login" };
      if (step === "verify-2fa")  return { step, redirectTo: "/verify-2fa" };
      return { step: "dashboard", redirectTo: "/dashboard" };
    }
  } catch {
    // fall through to /auth/status
  }

  try {
    const status = await checkAuthStatus();
    if (!status || !status.user || !status.mfaVerified) {
      return { step: "login", redirectTo: "/login" };
    }
    const role = status.user.role || "user";
    if (role === "admin")   return { step: "dashboard", redirectTo: "/admin-dashboard" };
    if (role === "partner") return { step: "dashboard", redirectTo: "/partner-dashboard" };
    return { step: "dashboard", redirectTo: "/dashboard" };
  } catch {
    return { step: "login", redirectTo: "/login" };
  }
}

/* ──────────────────────────────────────────────────────────────
   Public Auth APIs
   NOTE: backend now uses /auth/local/* for local auth
────────────────────────────────────────────────────────────── */
export async function checkAuthStatus() {
  try {
    const res = await API.get("/auth/status");
    // If your API sometimes returns an accessToken in status, capture it; otherwise rely on cookies
    if (res?.data?.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
    return res.data;
  } catch {
    return { isAuthenticated: false };
  }
}

export async function refreshToken() {
  const res = await API.post("/auth/refresh", {});
  if (res?.data?.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
  return res.data;
}

// UPDATED paths for local auth:
export async function registerUser(userData) {
  // expects { email, password, name? }
  const res = await API.post("/auth/local/register", userData);
  // login is cookie-based; if server returns an accessToken, store it:
  if (res?.data?.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
  return res.data;
}

export async function loginUser(credentials) {
  // expects { email, password }
  const res = await API.post("/auth/local/login", credentials);
  if (res?.data?.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
  return res.data;
}

export async function logoutUser() {
  await API.post("/auth/logout", {}); // POST avoids caches/proxies
  setAccessToken(null);
  window.location.assign("/login");
}

/* ──────────────────────────────────────────────────────────────
   Dashboards (unchanged)
────────────────────────────────────────────────────────────── */
export const fetchUserDashboard  = async () => (await API.get("/user/dashboard")).data;
export const fetchAdminDashboard = async () => (await API.get("/admin/dashboard")).data;

/* ──────────────────────────────────────────────────────────────
   Subscriptions (unchanged)
────────────────────────────────────────────────────────────── */
export const fetchSubscriptions = async () => (await API.get("/subscriptions")).data;
export const submitSubscriptionQuestionnaire = async (formData) =>
  (await API.post("/subscriptions/questionnaire", formData)).data;

/* ──────────────────────────────────────────────────────────────
   Views (unchanged if backend route exists)
────────────────────────────────────────────────────────────── */
export const fetchEnabledViews = async () => (await API.get("/auth/enabled-views")).data.enabledViews;

/* ──────────────────────────────────────────────────────────────
   Admin / Partner (unchanged paths)
────────────────────────────────────────────────────────────── */
export const fetchAffiliatePartners = async () => (await API.get("/admin/affiliates")).data;

export const fetchPartnerAnalytics = async (params = {}) => (await API.get("/partner/analytics", { params })).data;
export const fetchPartnerComments  = async () => (await API.get("/partner/comments")).data;
export const replyToComment        = async ({ commentId, reply }) =>
  (await API.post("/partner/comments/" + encodeURIComponent(commentId) + "/reply", { reply })).data;

// Promotions
export const uploadPromoImage = async (formData) =>
  (await API.post("/partner/promo/image", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;
export const uploadPromoVideo = async (formData) =>
  (await API.post("/partner/promo/video", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;

// Subscription management
export const getPartnerSubscription    = async () => (await API.get("/partner/subscription")).data;
export const updatePartnerSubscription = async (tier) => (await API.post("/partner/subscription", { tier })).data;

/* ──────────────────────────────────────────────────────────────
   2FA (updated to match backend mounts: /2fa-email and /2fa-app)
────────────────────────────────────────────────────────────── */
export const email2FA = {
  // server endpoints: /2fa-email/send, /2fa-email/resend, /2fa-email/verify
  send:   async () => (await API.post("/2fa-email/send")).data,
  resend: async () => (await API.post("/2fa-email/resend")).data,
  verify: async ({ code, trustThisDevice = false }) =>
    (await API.post("/2fa-email/verify", { code, trustThisDevice })).data,
};

export const app2FA = {
  setup:   async () => (await API.get("/2fa-app/setup")).data,
  verify:  async (token) => (await API.post("/2fa-app/verify", { token })).data,
  disable: async () => (await API.post("/2fa-app/disable")).data,
};
