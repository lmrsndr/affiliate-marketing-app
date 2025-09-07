// src/api.js — LOOP-PROOF SAFE BUILD
// ==================================
// Build banner (visible in Console to confirm correct bundle is live)
window.__BB_API_BUILD = "api.js SAFE build 2025-09-07";
console.info("[BB] api.js SAFE build loaded:", window.__BB_API_BUILD);

import axios from "axios";

/* ===== Env & Base URL ===== */
if (!import.meta.env.VITE_API_URL)
  console.warn("⚠️ Missing VITE_API_URL in env. Using https://api.bundlebee.co.uk");
const safeBaseURL = (import.meta.env.VITE_API_URL || "https://api.bundlebee.co.uk").replace(/\/+$/, "");

/* ===== In-memory access token (optional; avoid localStorage) ===== */
let ACCESS_TOKEN_MEMORY = "";
export const setAccessToken = (t = "") => (ACCESS_TOKEN_MEMORY = t || "");
export const clearAccessToken = () => (ACCESS_TOKEN_MEMORY = "");
export const getAccessToken = () => ACCESS_TOKEN_MEMORY;

/* ===== Axios instance (single source of truth) ===== */
const API = axios.create({
  baseURL: safeBaseURL,
  withCredentials: true,            // send HttpOnly cookies
  xsrfCookieName: "csrfToken",      // backend should set this cookie
  xsrfHeaderName: "X-CSRF-Token",   // Axios copies cookie -> header
});

export default API;

/* ===== Request interceptor: attach in-memory bearer if present ===== */
API.interceptors.request.use(
  (config) => {
    if (ACCESS_TOKEN_MEMORY) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${ACCESS_TOKEN_MEMORY}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ===== Response interceptor: LOOP-PROOF 401/403 handling =====
   - Never alert/redirect on SAFE_PUBLIC pages (prevents callback loops)
   - Single refresh attempt using HttpOnly cookie
   - Optional new access token stays in memory only
================================================================= */
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const reason = error?.response?.data?.reason;
    const originalRequest = error?.config || {};
    if (originalRequest._retry == null) originalRequest._retry = false;

    // Pages where we NEVER force redirect/alert to avoid loops
    const PATH = window.location.pathname || "/";
    const SAFE_PUBLIC_REGEX = /^(\/|\/login|\/register|\/auth\/callback|\/verify-2fa|\/setup-2fa)$/;

    // 403: server says TOTP/2FA setup required
    if (status === 403 && reason === "TOTP_REQUIRED") {
      if (!SAFE_PUBLIC_REGEX.test(PATH)) window.location.href = "/setup-2fa";
      return Promise.reject(error);
    }

    // 401: try one refresh using HttpOnly cookie
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.get(`${safeBaseURL}/auth/refresh`, {
          withCredentials: true,
          xsrfCookieName: "csrfToken",
          xsrfHeaderName: "X-CSRF-Token",
        });

        if (data?.accessToken) setAccessToken(data.accessToken);

        // Re-issue the original request
        if (getAccessToken()) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${getAccessToken()}`;
        } else if (originalRequest.headers) {
          delete originalRequest.headers.Authorization; // rely on cookies
        }
        return API.request(originalRequest);
      } catch {
        // Refresh failed; clear any in-memory token and decide redirect below
        clearAccessToken();
      }
    }

    // Final 401 handling: DO NOT interrupt SAFE pages (avoid auth loop)
    if (status === 401) {
      if (!SAFE_PUBLIC_REGEX.test(PATH)) {
        console.warn("⚠️ Session expired. Redirecting to /login");
        window.location.href = "/login?reason=session-expired";
      } else {
        console.warn("401 on safe page — suppressed redirect to avoid auth loop.");
      }
    }

    return Promise.reject(error);
  }
);

/* ===== Auth utilities (server-driven) ===== */

// Ask server what the next step is (login | verify-2fa | setup-2fa | dashboard)
export const getNextAuthStep = async () => {
  try {
    const res = await API.get("/auth/next");
    // { step: "login"|"verify-2fa"|"setup-2fa"|"dashboard", redirectTo? }
    return res.data;
  } catch (err) {
    console.error("❌ /auth/next failed:", err?.response?.data || err.message);
    return { step: "login" };
  }
};

export const checkAuthStatus = async () => {
  try {
    const res = await API.get("/auth/status");
    if (res.data?.accessToken) setAccessToken(res.data.accessToken);
    return res.data;
  } catch (err) {
    console.error("❌ Authentication Check Failed:", err?.response?.data || err.message);
    return { isAuthenticated: false };
  }
};

export const refreshToken = async () => {
  const res = await API.get("/auth/refresh");
  if (res.data?.accessToken) setAccessToken(res.data.accessToken);
  return res.data;
};

export const registerUser = async (userData) => {
  const res = await API.post("/auth/register", userData);
  if (res.data?.accessToken) setAccessToken(res.data.accessToken);
  return res.data;
};

export const loginUser = async (credentials) => {
  const res = await API.post("/auth/login", credentials);
  if (res.data?.accessToken) setAccessToken(res.data.accessToken);
  return res.data;
};

export const logoutUser = async () => {
  try { await API.get("/auth/logout"); } catch (_) {}
  clearAccessToken();
  window.location.href = "/login";
};

/* ===== API helpers (unchanged signatures) ===== */

export const fetchUserDashboard = async () => (await API.get("/user/dashboard")).data;
export const fetchAdminDashboard = async () => (await API.get("/admin/dashboard")).data;

export const fetchSubscriptions = async () => (await API.get("/subscriptions")).data;
export const submitSubscriptionQuestionnaire = async (formData) => (await API.post("/subscriptions/questionnaire", formData)).data;

export const fetchEnabledViews = async () => {
  const res = await API.get("/auth/enabled-views");
  return res.data.enabledViews;
};

export const fetchAffiliatePartners = async () => (await API.get("/admin/affiliates")).data;

export const fetchUserProfile = async () => (await API.get("/user/profile")).data;

export const resetPassword = async (resetData) => (await API.post("/auth/reset-password", resetData)).data;
export const forgotUsername = async (email) => (await API.post("/auth/forgot-username", { email })).data;

export const fetchPartnerAnalytics = async (params = {}) => (await API.get("/partner/analytics", { params })).data;

export const fetchPartnerComments = async () => (await API.get("/partner/comments")).data;
export const replyToComment = async ({ commentId, reply }) => (await API.post(`/partner/comments/${commentId}/reply`, { reply })).data;

export const uploadPromoImage = async (formData) =>
  (await API.post("/partner/promo/image", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;

export const uploadPromoVideo = async (formData) =>
  (await API.post("/partner/promo/video", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;

export const getPartnerSubscription = async () => (await API.get("/partner/subscription")).data;
export const updatePartnerSubscription = async (tier) => (await API.post("/partner/subscription", { tier })).data;

/* ===== 2FA ===== */
export const generate2FA = async () => (await API.get("/2fa/generate")).data;
export const verify2FA = async (token, extra = {}) => (await API.post("/2fa/verify", { token, ...extra })).data;
export const disable2FA = async () => (await API.post("/2fa/disable")).data;
