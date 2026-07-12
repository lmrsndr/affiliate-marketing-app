import axios from "axios";
import {
  clearSupabaseSession,
  getSupabaseAccessToken,
  signOutSupabase,
} from "./supabaseAuth";

const safeBaseURL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");

const API = axios.create({
  baseURL: safeBaseURL,
  withCredentials: false,
});

API.interceptors.request.use(
  async (config) => {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      const token = await getSupabaseAccessToken().catch(() => "");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const path = window.location.pathname;

    if (status === 401 && !["/", "/login", "/auth/callback"].includes(path)) {
      clearSupabaseSession();
      window.location.assign(`/login?reason=session-expired&redirect=${encodeURIComponent(path)}`);
    }

    return Promise.reject(error);
  }
);

export async function getBackendSupabaseSession() {
  try {
    return (await API.get("/supabase/session")).data;
  } catch (error) {
    if (error?.response?.status === 401) clearSupabaseSession();
    throw error;
  }
}

export async function logoutUser() {
  await signOutSupabase().catch(() => clearSupabaseSession());
  window.location.assign("/");
}

export default API;
