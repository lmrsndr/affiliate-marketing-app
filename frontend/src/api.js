// api.js (secure refactor)
// --------------------------------------------------
import axios from "axios";

// ===== Environment checks =====
if (!import.meta.env.VITE_API_URL) console.warn("⚠️ Missing VITE_API_URL in env!");
if (!import.meta.env.VITE_GOOGLE_AUTH_URL) console.warn("⚠️ Missing VITE_GOOGLE_AUTH_URL in env!");
if (!import.meta.env.VITE_GOOGLE_REDIRECT_URI) console.warn("⚠️ Missing VITE_GOOGLE_REDIRECT_URI in env!");

// ===== Normalize API Base URL =====
const safeBaseURL = (import.meta.env.VITE_API_URL || "https://api.bundlebee.co.uk").replace(/\/+$/, "");

// ===== In-memory access token (optional, short-lived) =====
// If your backend uses HttpOnly cookies only, this will remain empty.
let ACCESS_TOKEN_MEMORY = "";

// Allow other modules to set/clear/read the in-memory token if needed
export function setAccessToken(token = "") { ACCESS_TOKEN_MEMORY = token || ""; }
export function clearAccessToken() { ACCESS_TOKEN_MEMORY = ""; }
export function getAccessToken() { return ACCESS_TOKEN_MEMORY; }

// ===== Create Axios instance =====
const API = axios.create({
  baseURL: safeBaseURL,
  withCredentials: true, // send HttpOnly cookies
  // CSRF: axios will read cookie "csrfToken" and send header "X-CSRF-Token"
  xsrfCookieName: "csrfToken",
  xsrfHeaderName: "X-CSRF-Token",
});

export default API;

// ===== Request interceptor: attach in-memory Authorization if present =====
API.interceptors.request.use(
  (config) => {
    if (ACCESS_TOKEN_MEMORY) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${ACCESS_TOKEN_MEMORY}`;
    }
    return config;
  },
  (error) => {
    console.error("❌ Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

// ===== Response interceptor: 401/403 handling (no loops) =====
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const reason = error?.response?.data?.reason;
    const originalRequest = error?.config || {};

    if (originalRequest && typeof originalRequest === "object" && originalRequest._retry == null) {
      originalRequest._retry = false;
    }

    // 403 — server indicates TOTP required
    if (status === 403 && reason === "TOTP_REQUIRED") {
      console.warn("⛔ Redirecting to /setup-2fa due to missing TOTP");
      window.location.href = "/setup-2fa";
      return;
    }

    // 401 — try single refresh using HttpOnly cookie
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axios.get(`${safeBaseURL}/auth/refresh`, {
          withCredentials: true,
          xsrfCookieName: "csrfToken",
          xsrfHeaderName: "X-CSRF-Token",
        });

        if (data?.accessToken) setAccessToken(data.accessToken);

        if (ACCESS_TOKEN_MEMORY) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${ACCESS_TOKEN_MEMORY}`;
        } else if (originalRequest.headers) {
          delete originalRequest.headers.Authorization;
        }
        return API.request(originalRequest);
      } catch (refreshError) {
        console.warn("♻️ Refresh failed, proceeding to cleanup/redirect");
        clearAccessToken();
      }
    }

    // After failed refresh or any plain 401, decide whether to redirect
    if (status === 401) {
      const SAFE_PUBLIC_PATHS = [
        "/", "/login", "/register",
        "/auth/callback", "/verify-2fa", "/setup-2fa"
      ];
      const isOnSafePublic = SAFE_PUBLIC_PATHS.includes(window.location.pathname);
      if (!isOnSafePublic) {
        console.warn("⚠️ Session expired. Redirecting to /login");
        window.location.href = "/login?reason=session-expired";
      }
    }

    return Promise.reject(error);
  }
);

// ===== Auth utilities =====

// Server-driven step: let backend decide the next screen based on HttpOnly session.
export const getNextAuthStep = async () => {
  try {
    const res = await API.get("/auth/next");
    // Expected: { step: "verify-2fa"|"setup-2fa"|"dashboard"|"login", redirectTo? }
    return res.data;
  } catch (err) {
    console.error("❌ /auth/next failed:", err);
    return { step: "login" };
  }
};

export const checkAuthStatus = async () => {
  try {
    const res = await API.get("/auth/status");
    if (res.data?.accessToken) setAccessToken(res.data.accessToken);
    return res.data;
  } catch (err) {
    console.error("❌ Authentication check failed:", err);
    return { isAuthenticated: false };
  }
};

export const refreshToken = async () => {
  try {
    const res = await API.get("/auth/refresh");
    if (res.data?.accessToken) setAccessToken(res.data.accessToken);
    return res.data;
  } catch (err) {
    console.error("❌ Refresh token failed:", err);
    clearAccessToken();
    throw err;
  }
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
  try {
    await API.get("/auth/logout");
  } finally {
    clearAccessToken();
    window.location.href = "/login";
  }
};

// ===== Example protected resources =====
export const fetchUserDashboard = async () => (await API.get("/user/dashboard")).data;
export const fetchAdminDashboard = async () => (await API.get("/admin/dashboard")).data;

// ===== Subscriptions =====
export const fetchSubscriptions = async () => (await API.get("/subscriptions")).data;
export const submitSubscriptionQuestionnaire = async (formData) => (await API.post("/subscriptions/questionnaire", formData)).data;

// ===== Authenticated View Control =====
export const fetchEnabledViews = async () => {
  const res = await API.get("/auth/enabled-views");
  return res.data.enabledViews;
};

// ===== Admin Affiliate Controls =====
export const fetchAffiliatePartners = async () => (await API.get("/admin/affiliates")).data;

// ===== User Profile =====
export const fetchUserProfile = async () => (await API.get("/user/profile")).data;

// ===== Auth Recovery =====
export const resetPassword = async (resetData) => (await API.post("/auth/reset-password", resetData)).data;
export const forgotUsername = async (email) => (await API.post("/auth/forgot-username", { email })).data;

// ===== Partner Analytics =====
export const fetchPartnerAnalytics = async (params = {}) => (await API.get("/partner/analytics", { params })).data;

// ===== Comments & Replies =====
export const fetchPartnerComments = async () => (await API.get("/partner/comments")).data;
export const replyToComment = async ({ commentId, reply }) => (await API.post(`/partner/comments/${commentId}/reply`, { reply })).data;

// ===== Promotions =====
export const uploadPromoImage = async (formData) =>
  (await API.post("/partner/promo/image", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;

export const uploadPromoVideo = async (formData) =>
  (await API.post("/partner/promo/video", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;

// ===== Subscription Management =====
export const getPartnerSubscription = async () => (await API.get("/partner/subscription")).data;
export const updatePartnerSubscription = async (tier) => (await API.post("/partner/subscription", { tier })).data;

// ===== Two-Factor Authentication (2FA) =====
export const generate2FA = async () => (await API.get("/2fa/generate")).data;
export const verify2FA = async (token) => (await API.post("/2fa/verify", { token })).data;
export const disable2FA = async () => (await API.post("/2fa/disable")).data;
