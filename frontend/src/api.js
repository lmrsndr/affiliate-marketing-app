import axios from "axios";

const safeBaseURL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");

const API = axios.create({
  baseURL: safeBaseURL,
  withCredentials: true,
});

export default API;

export function setAccessToken(token) {
  if (!token) {
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("accessToken");
    delete API.defaults.headers.common.Authorization;
    return;
  }

  sessionStorage.setItem("accessToken", token);
  API.defaults.headers.common.Authorization = `Bearer ${token}`;
}

function readAccessToken() {
  return sessionStorage.getItem("accessToken") || null;
}

function clearAccessToken() {
  setAccessToken(null);
}

API.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};
    const token = readAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
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

    if (status === 403) {
      const onVerify = path === "/verify-2fa" || path === "/setup-2fa";
      if (["MFA_REQUIRED", "EMAIL_2FA_REQUIRED", "TOTP_REQUIRED"].includes(reason)) {
        if (!onVerify) window.location.assign("/verify-2fa");
        return Promise.reject(error);
      }
      if (reason === "TOTP_REQUIRED_SETUP") {
        if (!onVerify) window.location.assign("/setup-2fa");
        return Promise.reject(error);
      }
    }

    const shouldTryRefresh =
      status === 401 ||
      (status === 403 && !["MFA_REQUIRED", "EMAIL_2FA_REQUIRED", "TOTP_REQUIRED", "TOTP_REQUIRED_SETUP"].includes(reason));

    if (shouldTryRefresh && !original._retry && !isRefreshing) {
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await API.post("/auth/refresh");
        if (data?.accessToken) {
          setAccessToken(data.accessToken);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${data.accessToken}`;
        }
        return API.request(original);
      } catch (_refreshError) {
        clearAccessToken();
        if (!["/", "/login"].includes(window.location.pathname)) {
          window.location.assign("/login?reason=session-expired");
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export async function checkAuthStatus() {
  try {
    const { data } = await API.get("/auth/status");
    if (data?.accessToken) setAccessToken(data.accessToken);
    return data;
  } catch {
    return { isAuthenticated: false, user: null, mfaVerified: false };
  }
}

export async function getNextAuthStep() {
  try {
    const { data } = await API.get("/auth/next");
    const step = data?.step || data?.next;
    if (step === "login") return { step, redirectTo: "/login" };
    if (step === "verify-2fa") return { step, redirectTo: "/verify-2fa" };

    const status = await checkAuthStatus();
    if (!status?.user || !status?.mfaVerified) return { step: "login", redirectTo: "/login" };
    return {
      step: "dashboard",
      redirectTo: status.user.role === "admin" ? "/admin" : "/",
    };
  } catch {
    return { step: "login", redirectTo: "/login" };
  }
}

export async function loginUser(credentials) {
  const { data } = await API.post("/auth/local/login", credentials);
  if (data?.accessToken) setAccessToken(data.accessToken);
  return data;
}

export async function logoutUser() {
  await API.get("/auth/logout");
  clearAccessToken();
  window.location.assign("/");
}

export const email2FA = {
  send: async () => (await API.post("/2fa-email/send")).data,
  resend: async () => (await API.post("/2fa-email/resend")).data,
  verify: async ({ code, trustThisDevice = false }) =>
    (await API.post("/2fa-email/verify", { code, trustThisDevice })).data,
};

export const app2FA = {
  setup: async () => (await API.get("/2fa-app/setup")).data,
  verify: async (token) => (await API.post("/2fa-app/verify", { token })).data,
  disable: async () => (await API.post("/2fa-app/disable")).data,
};
