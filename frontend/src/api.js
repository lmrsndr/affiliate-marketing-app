// At very top of src/api.js:
window.__BB_API_BUILD = "api.js SAFE build 2025-09-07 + getNextAuthStep/setAccessToken";
console.info("[BB] api.js SAFE build loaded:", window.__BB_API_BUILD);

import axios from "axios";

// ✅ Environment Checks
if (!import.meta.env.VITE_API_URL) console.warn("⚠️ Missing VITE_API_URL in environment variables!");
if (!import.meta.env.VITE_GOOGLE_AUTH_URL) console.warn("⚠️ Missing VITE_GOOGLE_AUTH_URL in environment variables!");
if (!import.meta.env.VITE_GOOGLE_REDIRECT_URI) console.warn("⚠️ Missing VITE_GOOGLE_REDIRECT_URI in environment variables!");

// ✅ Normalize API Base URL (must point to backend /api root, e.g. https://api.bundlebee.co.uk/api)
const safeBaseURL = (import.meta.env.VITE_API_URL || "https://api.bundlebee.co.uk/api").replace(/\/+$/, "");

// ✅ Create Axios Instance
const API = axios.create({
  baseURL: safeBaseURL,
  withCredentials: true,
});

// ───────────────────────────────────────────────────────────────
// Token helpers
// ───────────────────────────────────────────────────────────────
export function setAccessToken(token, { persist = "both" } = {}) {
  // persist: "session" | "local" | "both" | "none"
  if (!token) {
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("accessToken");
    delete API.defaults.headers.common["Authorization"];
    return;
  }
  if (persist === "session" || persist === "both") sessionStorage.setItem("accessToken", token);
  if (persist === "local"   || persist === "both") localStorage.setItem("accessToken", token);
  API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

function readAccessToken() {
  return sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken") || null;
}

function clearAccessToken() {
  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("accessToken");
  delete API.defaults.headers.common["Authorization"];
}

// ───────────────────────────────────────────────────────────────
// Request Interceptor: attach Authorization
// ───────────────────────────────────────────────────────────────
API.interceptors.request.use(
  (config) => {
    if (!config.headers) config.headers = {};
    if (!config.headers.Authorization) {
      const token = readAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    console.error("❌ Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

// ───────────────────────────────────────────────────────────────
// Response Interceptor: 401 refresh, 403 MFA routing
// ───────────────────────────────────────────────────────────────
let isRefreshing = false;

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const reason = error.response?.data?.reason;
    const originalRequest = error.config || {};

    // 🚦 Handle MFA/2FA-required reasons without loops
    if (status === 403) {
      const path = window.location.pathname;
      const onVerify = path === "/verify-2fa" || path === "/setup-2fa";

      if (reason === "MFA_REQUIRED" || reason === "EMAIL_2FA_REQUIRED") {
        if (!onVerify) window.location.assign("/verify-2fa");
        return Promise.reject(error);
      }
      if (reason === "TOTP_REQUIRED") {
        if (!onVerify) window.location.assign("/verify-2fa"); // Verify page can branch to TOTP setup if needed
        return Promise.reject(error);
      }
      if (reason === "TOTP_REQUIRED_SETUP") {
        if (path !== "/setup-2fa") window.location.assign("/setup-2fa");
        return Promise.reject(error);
      }
    }

    // 🔁 401 → refresh once
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) return Promise.reject(error);
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${safeBaseURL}/auth/refresh`, {}, { withCredentials: true });
        if (data?.accessToken) {
          setAccessToken(data.accessToken, { persist: "both" });
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return API.request(originalRequest);
        }
      } catch (refreshError) {
        console.error("❌ Refresh token failed. Logging out...", refreshError);
        clearAccessToken();
        const isPublic = ["/", "/login", "/register"].includes(window.location.pathname);
        if (!isPublic) {
          window.location.assign("/login?reason=session-expired");
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default API;

// ───────────────────────────────────────────────────────────────
// Auth Navigation Helper used by OAuthCallback.vue
// ───────────────────────────────────────────────────────────────
export async function getNextAuthStep() {
  try {
    // Try the lightweight helper (if backend implements /auth/next)
    const { data } = await API.get("/auth/next");
    if (data?.step) return data; // { step, redirectTo }
  } catch (e) {
    // 404 or not implemented → fall back to /auth/status below
  }

  // Fallback: derive next step from /auth/status
  try {
    const status = await checkAuthStatus();
    if (!status?.isAuthenticated) return { step: "login", redirectTo: "/login" };

    const user = status.user || {};
    const mfa = !!(status.user?.twoFAVerified || status.mfaVerified);

    if (!mfa) return { step: "verify-2fa", redirectTo: "/verify-2fa" };

    const role = user.role || "user";
    if (role === "admin")   return { step: "dashboard", redirectTo: "/admin-dashboard" };
    if (role === "partner") return { step: "dashboard", redirectTo: "/partner-dashboard" };
    return { step: "dashboard", redirectTo: "/dashboard" };
  } catch {
    return { step: "login", redirectTo: "/login" };
  }
}

// ───────────────────────────────────────────────────────────────
// Public Auth Utilities
// ───────────────────────────────────────────────────────────────
export const checkAuthStatus = async () => {
  try {
    console.log("🔍 Checking authentication status...");
    const res = await API.get("/auth/status");
    // If backend returns an accessToken (cookie rotation), persist it
    if (res?.data?.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
    return res.data;
  } catch (err) {
    console.error("❌ Authentication Check Failed:", err);
    return { isAuthenticated: false };
  }
};

export const refreshToken = async () => {
  const res = await API.post("/auth/refresh", {});
  if (res?.data?.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
  return res.data;
};

export const registerUser = async (userData) => {
  const res = await API.post("/auth/register", userData);
  if (res?.data?.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
  return res.data;
};

export const loginUser = async (credentials) => {
  const res = await API.post("/auth/login", credentials);
  if (res?.data?.accessToken) setAccessToken(res.data.accessToken, { persist: "both" });
  return res.data;
};

export const logoutUser = async () => {
  await API.post("/auth/logout", {}); // use POST to avoid caches/proxies
  setAccessToken(null);
  window.location.assign("/login");
};

// ───────────────────────────────────────────────────────────────
// User & Admin
// ───────────────────────────────────────────────────────────────
export const fetchUserDashboard = async () => (await API.get("/user/dashboard")).data;
export const fetchAdminDashboard = async () => (await API.get("/admin/dashboard")).data;

// ───────────────────────────────────────────────────────────────
// Subscriptions
// ───────────────────────────────────────────────────────────────
export const fetchSubscriptions = async () => (await API.get("/subscriptions")).data;
export const submitSubscriptionQuestionnaire = async (formData) => (await API.post("/subscriptions/questionnaire", formData)).data;

// ───────────────────────────────────────────────────────────────
// Authenticated View Control
// ───────────────────────────────────────────────────────────────
export const fetchEnabledViews = async () => (await API.get("/auth/enabled-views")).data.enabledViews;

// ───────────────────────────────────────────────────────────────
// Admin Affiliate Controls
// ───────────────────────────────────────────────────────────────
export const fetchAffiliatePartners = async () => (await API.get("/admin/affiliates")).data;

// ───────────────────────────────────────────────────────────────
// User Profile
// ───────────────────────────────────────────────────────────────
export const fetchUserProfile = async () => (await API.get("/user/profile")).data;

// ───────────────────────────────────────────────────────────────
// Auth Recovery
// ───────────────────────────────────────────────────────────────
export const resetPassword   = async (resetData) => (await API.post("/auth/reset-password", resetData)).data;
export const forgotUsername  = async (email)     => (await API.post("/auth/forgot-username", { email })).data;

// ───────────────────────────────────────────────────────────────
// Partner Analytics & Comments
// ───────────────────────────────────────────────────────────────
export const fetchPartnerAnalytics = async (params = {}) => (await API.get("/partner/analytics", { params })).data;
export const fetchPartnerComments  = async () => (await API.get("/partner/comments")).data;
export const replyToComment        = async ({ commentId, reply }) => (await API.post(\`/partner/comments/\${commentId}/reply\`, { reply })).data;

// ───────────────────────────────────────────────────────────────
// Promotions
// ───────────────────────────────────────────────────────────────
export const uploadPromoImage = async (formData) => (await API.post("/partner/promo/image", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;
export const uploadPromoVideo = async (formData) => (await API.post("/partner/promo/video", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;

// ───────────────────────────────────────────────────────────────
// Subscription Management
// ───────────────────────────────────────────────────────────────
export const getPartnerSubscription     = async () => (await API.get("/partner/subscription")).data;
export const updatePartnerSubscription  = async (tier) => (await API.post("/partner/subscription", { tier })).data;

// ───────────────────────────────────────────────────────────────
// Two-Factor Authentication (2FA)
// ───────────────────────────────────────────────────────────────
export const generate2FA = async () => (await API.get("/2fa/generate")).data;    // legacy path if used
export const verify2FA   = async (token) => (await API.post("/2fa/verify", { token })).data;
export const disable2FA  = async () => (await API.post("/2fa/disable")).data;

// New, explicit namespaces (if your BE routes follow /api/auth/2fa-*)
export const email2FA = {
  context: async () => (await API.post("/auth/2fa-email/context")).data ?? {},
  send:    async () => (await API.post("/auth/2fa-email/send")).data,
  resend:  async () => (await API.post("/auth/2fa-email/resend")).data,
  verify:  async ({ code, trustThisDevice = false }) => (await API.post("/auth/2fa-email/verify", { code, trustThisDevice })).data,
};

export const app2FA = {
  setup:  async () => (await API.get("/auth/2fa-app/setup")).data,
  verify: async (token) => (await API.post("/auth/2fa-app/verify", { token })).data,
  disable:async () => (await API.post("/auth/2fa-app/disable")).data,
};

