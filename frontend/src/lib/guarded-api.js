import API from "@/api";

/** Internal: common 403 handling */
function handle403(reason) {
  if (reason === "TOTP_REQUIRED" || reason === "EMAIL_2FA_REQUIRED" || reason === "MFA_REQUIRED") {
    window.location.assign("/verify-2fa");
    return true;
  }
  if (reason === "NOT_ADMIN") {
    window.location.assign("/dashboard");
    return true;
  }
  return false;
}

export async function guardedGet(path, config = {}) {
  try {
    const res = await API.get(path, config);
    return res.data;
  } catch (err) {
    const s = err?.response?.status;
    const r = err?.response?.data?.reason;
    if (s === 403 && handle403(r)) return;
    throw err;
  }
}

export async function guardedPost(path, body = {}, config = {}) {
  try {
    const res = await API.post(path, body, config);
    return res.data;
  } catch (err) {
    const s = err?.response?.status;
    const r = err?.response?.data?.reason;
    if (s === 403 && handle403(r)) return;
    throw err;
  }
}

export async function guardedPut(path, body = {}, config = {}) {
  try {
    const res = await API.put(path, body, config);
    return res.data;
  } catch (err) {
    const s = err?.response?.status;
    const r = err?.response?.data?.reason;
    if (s === 403 && handle403(r)) return;
    throw err;
  }
}
