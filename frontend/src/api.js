// Build tag for quick diagnostics
window.__BB_API_BUILD = "api.js unified 2025-09-07";
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
  withCredentials: true,
});
export default API;

/* ──────────────────────────────────────────────────────────────
   Token helpers (header token only; server mainly uses cookies)
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

    // 401 → refresh once
    if (status === 401 && !original._retry) {
      if (isRefreshing) return Promise.reject(error);
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(safeBaseURL + "/auth/refresh", {}, { withCredentials: true });
        if (data && data.accessToken) {
          setAccessToken(data.accessToken, { persist: "both" });
          original.headers = original.headers || {};
          original.headers.Authorization = "Bearer " + data.accessToken;
          return API.request(original);
        }
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
   Prefers /auth/next; falls back to /auth/status if missing
────────────────────────────────────────────────────────────── */
export async function getNextAuthStep() {
  try {
    const { data } = await API.get("/auth/next");
    if (data && data.step) return data; // { step, redirectTo? }
  } catch {
    // fall through to /auth/status
  }

  try {
    const status = await checkAuthStatus();
    if (!status || !status.isAuthenticated) return { step: "login", redirectTo: "/login" };
    const user = status.user || {};
    const mfa = !!(status.mfaVerified || user.twoFAVerified);
    if (!mfa) return { step: "verify-2fa", redirectTo: "/verify-2fa" };
    const role = user.role || "user";
    if (role === "admin")   return { step: "dashboard", redirectTo: "/admin-dashboard" };
    if (role === "partner") return { step: "dashboard", redirectTo: "/partner-dashboard" };
    return { step: "dashboard", redirectTo: "/dashboard" };
  } catch {
    return { step: "login", redirectTo: "/login" };
  }
}

/* ──────────────────────────────────────────────────────────────
   Public Auth APIs
────────────────────────────────────────────────────────────── */
export async function checkAuthStatus() {
  try {
    const res = await API.get("/auth/status");
    if (res && res.data && res.data.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
    return res.data;
  } catch {
    return { isAuthenticated: false };
  }
}
export async function refreshToken() {
  const res = await API.post("/auth/refresh", {});
  if (res && res.data && res.data.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
  return res.data;
}
export async function registerUser(userData) {
  const res = await API.post("/auth/register", userData);
  if (res && res.data && res.data.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
  return res.data;
}
export async function loginUser(credentials) {
  const res = await API.post("/auth/login", credentials);
  if (res && res.data && res.data.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
  return res.data;
}
export async function logoutUser() {
  await API.post("/auth/logout", {}); // POST avoids caches/proxies
  setAccessToken(null);
  window.location.assign("/login");
}

/* ──────────────────────────────────────────────────────────────
   Dashboards
────────────────────────────────────────────────────────────── */
export const fetchUserDashboard  = async () => (await API.get("/user/dashboard")).data;
export const fetchAdminDashboard = async () => (await API.get("/admin/dashboard")).data;

/* ──────────────────────────────────────────────────────────────
   Subscriptions
────────────────────────────────────────────────────────────── */
export const fetchSubscriptions = async () => (await API.get("/subscriptions")).data;
export const submitSubscriptionQuestionnaire = async (formData) =>
  (await API.post("/subscriptions/questionnaire", formData)).data;

/* ──────────────────────────────────────────────────────────────
   Views
────────────────────────────────────────────────────────────── */
export const fetchEnabledViews = async () => (await API.get("/auth/enabled-views")).data.enabledViews;

/* ──────────────────────────────────────────────────────────────
   Admin / Partner
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
   2FA (legacy + namespaced)
────────────────────────────────────────────────────────────── */
// Legacy names if still referenced somewhere:
export const generate2FA = async () => (await API.get("/2fa/generate")).data;
export const verify2FA   = async (token) => (await API.post("/2fa/verify", { token })).data;
export const disable2FA  = async () => (await API.post("/2fa/disable")).data;

// Current explicit namespaces used by new routes:
export const email2FA = {
  context: async () => (await API.post("/auth/2fa-email/context")).data || {},
  send:    async () => (await API.post("/auth/2fa-email/resend")).data,
  resend:  async () => (await API.post("/auth/2fa-email/resend")).data,
  verify:  async ({ code, trustThisDevice = false }) =>
    (await API.post("/auth/2fa-email/verify", { code, trustThisDevice })).data,
};

export const app2FA = {
  setup:   async () => (await API.get("/auth/2fa-app/setup")).data,
  verify:  async (token) => (await API.post("/auth/2fa-app/verify", { token })).data,
  disable: async () => (await API.post("/auth/2fa-app/disable")).data,
};
