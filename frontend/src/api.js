import axios from "axios";

// ✅ Environment Checks
if (!import.meta.env.VITE_API_URL) console.warn("⚠️ Missing VITE_API_URL in environment variables!");
if (!import.meta.env.VITE_GOOGLE_AUTH_URL) console.warn("⚠️ Missing VITE_GOOGLE_AUTH_URL in environment variables!");
if (!import.meta.env.VITE_GOOGLE_REDIRECT_URI) console.warn("⚠️ Missing VITE_GOOGLE_REDIRECT_URI in environment variables!");

// ✅ Normalize API Base URL
const safeBaseURL = (import.meta.env.VITE_API_URL || "https://api.bundlebee.co.uk").replace(/\/+$/, "");

// ✅ Create Axios Instance
const API = axios.create({
  baseURL: safeBaseURL,
  withCredentials: true,
});

export default API;

// ✅ Attach Authorization Header Automatically
API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("⚠️ No access token found. Some requests may fail.");
    }
    return config;
  },
  (error) => {
    console.error("❌ Request Interceptor Error:", error);
    return Promise.reject(error);
  }
);

// ✅ Global Response Interceptor for 401 / 403
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const reason = error.response?.data?.reason;
    const originalRequest = error.config;

    // ✅ Redirect to setup page if TOTP required
    if (status === 403 && reason === "TOTP_REQUIRED") {
      console.warn("⛔ Redirecting to /setup-2fa due to missing TOTP");
      window.location.href = "/setup-2fa";
      return;
    }

    // ✅ Attempt refresh token on 401 (only once)
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.get(`${safeBaseURL}/auth/refresh`, { withCredentials: true });

        sessionStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("accessToken", data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return API.request(originalRequest);
      } catch (refreshError) {
        console.error("❌ Refresh token failed. Logging out...");

        sessionStorage.removeItem("accessToken");
        localStorage.removeItem("accessToken");

        const isPublic = ["/", "/login", "/register"].includes(window.location.pathname);

        if (!isPublic) {
          alert("⚠️ Your session has expired. Please log in again.");
          window.location.href = "/login?reason=session-expired";
        }
      }
    }

    return Promise.reject(error);
  }
);

// ✅ Auth Utilities
export const checkAuthStatus = async () => {
  try {
    console.log("🔍 Checking authentication status...");
    const res = await API.get("/auth/status");
    return res.data;
  } catch (err) {
    console.error("❌ Authentication Check Failed:", err);
    return { isAuthenticated: false };
  }
};

export const refreshToken = async () => {
  try {
    const res = await API.get("/auth/refresh");
    sessionStorage.setItem("accessToken", res.data.accessToken);
    return res.data;
  } catch (err) {
    console.error("❌ Refresh Token Failed:", err);
    throw err;
  }
};

export const registerUser = async (userData) => {
  const res = await API.post("/auth/register", userData);
  return res.data;
};

export const loginUser = async (credentials) => {
  const res = await API.post("/auth/login", credentials);
  sessionStorage.setItem("accessToken", res.data.accessToken);
  localStorage.setItem("accessToken", res.data.accessToken);
  return res.data;
};

export const logoutUser = async () => {
  await API.get("/auth/logout");
  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("accessToken");
  window.location.href = "/login";
};

// ✅ User Dashboard
export const fetchUserDashboard = async () => {
  const res = await API.get("/user/dashboard");
  return res.data;
};

export const fetchAdminDashboard = async () => {
  const res = await API.get("/admin/dashboard");
  return res.data;
};

// ✅ Subscriptions
export const fetchSubscriptions = async () => {
  const res = await API.get("/subscriptions");
  return res.data;
};

export const submitSubscriptionQuestionnaire = async (formData) => {
  const res = await API.post("/subscriptions/questionnaire", formData);
  return res.data;
};

// ✅ Authenticated View Control
export const fetchEnabledViews = async () => {
  const res = await API.get("/auth/enabled-views");
  return res.data.enabledViews;
};

// ✅ Admin Affiliate Controls
export const fetchAffiliatePartners = async () => {
  const res = await API.get("/admin/affiliates");
  return res.data;
};

// ✅ User Profile
export const fetchUserProfile = async () => {
  const res = await API.get("/user/profile");
  return res.data;
};

// ✅ Auth Recovery
export const resetPassword = async (resetData) => {
  const res = await API.post("/auth/reset-password", resetData);
  return res.data;
};

export const forgotUsername = async (email) => {
  const res = await API.post("/auth/forgot-username", { email });
  return res.data;
};

// ✅ Partner Analytics
export const fetchPartnerAnalytics = async (params = {}) => {
  const res = await API.get("/partner/analytics", { params });
  return res.data;
};

// ✅ Comments & Replies
export const fetchPartnerComments = async () => {
  const res = await API.get("/partner/comments");
  return res.data;
};

export const replyToComment = async ({ commentId, reply }) => {
  const res = await API.post(`/partner/comments/${commentId}/reply`, { reply });
  return res.data;
};

// ✅ Promotions
export const uploadPromoImage = async (formData) => {
  const res = await API.post("/partner/promo/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const uploadPromoVideo = async (formData) => {
  const res = await API.post("/partner/promo/video", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ✅ Subscription Management
export const getPartnerSubscription = async () => {
  const res = await API.get("/partner/subscription");
  return res.data;
};

export const updatePartnerSubscription = async (tier) => {
  const res = await API.post("/partner/subscription", { tier });
  return res.data;
};

// ✅ Two-Factor Authentication (2FA)
export const generate2FA = async () => {
  const res = await API.get("/2fa/generate");
  return res.data;
};

export const verify2FA = async (token) => {
  const res = await API.post("/2fa/verify", { token });
  return res.data;
};

export const disable2FA = async () => {
  const res = await API.post("/2fa/disable");
  return res.data;
};
