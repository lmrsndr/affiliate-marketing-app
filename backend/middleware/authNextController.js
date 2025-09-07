// controllers/authNextController.js

function roleToDashboard(role) {
  if (role === "admin") return "/admin-dashboard";
  if (role === "partner") return "/partner-dashboard";
  return "/dashboard";
}

exports.getNext = async function getNext(req, res) {
  try {
    // What we know from middleware (may be absent if no cookies)
    const isAuth       = !!req.auth?.isAuthenticated;
    const mfaFromJWT   = !!req.auth?.mfaVerified;
    const hasOtpTicket = Boolean(req.cookies?.otpTicket);

    // Prefer a user doc when available; otherwise, fall back to JWT claims (role/id)
    const user  = req.user || null;
    const role  = user?.role || req.auth?.claims?.role || "user";

    // Consolidate 2FA state
    const twoFAEnabled  =
      Boolean(user?.twoFA?.enabled) ||
      Boolean(user?.email2FA?.verified) ||
      Boolean(user?.totpEnabled) || false;

    const twoFAVerified =
      mfaFromJWT ||
      Boolean(user?.twoFAVerified) ||
      Boolean(req.session?.twoFAVerified) || false;

    // Decision matrix
    if (!isAuth) {
      // If OAuth just dropped an OTP ticket, we're mid-flow → go to verify/setup
      if (hasOtpTicket) {
        return res.json({ step: twoFAEnabled ? "verify-2fa" : "setup-2fa" });
      }
      return res.json({ step: "login" });
    }

    // Authenticated but not verified yet
    if (!twoFAVerified) {
      if (twoFAEnabled || hasOtpTicket) {
        return res.json({ step: "verify-2fa" });
      }
      return res.json({ step: "setup-2fa" });
    }

    // Fully authenticated and verified
    return res.json({ step: "dashboard", redirectTo: roleToDashboard(role) });
  } catch (e) {
    // Be conservative on unexpected errors
    return res.json({ step: "login" });
  }
};
