// backend/controllers/authNextController.js
// Minimal, self-contained "what screen next" decision.

function roleToDashboard(role) {
  if (role === "admin") return "/admin-dashboard";
  if (role === "partner") return "/partner-dashboard";
  return "/dashboard";
}

exports.getNext = async function getNext(req, res) {
  try {
    // You likely already attach the user on req.user in your auth middleware.
    // Fallbacks try common places used across projects.
    const user =
      req.user ||
      res.locals?.user ||
      req.session?.user ||
      null;

    // If no session/user -> login
    if (!user) return res.json({ step: "login" });

    // Determine 2FA state
    const twoFAVerified =
      Boolean(user.twoFAVerified) ||
      Boolean(req.session?.twoFAVerified);

    // You may set an HttpOnly cookie like "otpTicket" during 2FA flow
    const hasOtpTicket = Boolean(req.cookies?.otpTicket);

    const twoFAEnabled =
      Boolean(user.twoFA?.enabled) || Boolean(user.totpEnabled) || false;

    // Not verified yet
    if (!twoFAVerified) {
      if (twoFAEnabled || hasOtpTicket) {
        return res.json({ step: "verify-2fa" });
      }
      // If your policy requires enabling TOTP, nudge to setup
      return res.json({ step: "setup-2fa" });
    }

    // Fully good to go
    const redirectTo = roleToDashboard(user.role);
    return res.json({ step: "dashboard", redirectTo });
  } catch (e) {
    // On unexpected error, be conservative
    return res.json({ step: "login" });
  }
};
