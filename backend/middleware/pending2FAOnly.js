/**
 * pending2FAOnly: gate for /api/2fa-email/* during the pending-2FA window.
 *
 * We intentionally do NOT block based on user.email2FA.verified, because that
 * is set per-session and is reset when we start a new OTP flow.
 *
 * This middleware expects a previous guard (otpOrRefresh) to attach:
 *   - req.auth.otpContext === true   when an otpTicket was presented
 *   - or req.auth.source === "refresh" && !req.auth.mfaVerified
 */
module.exports = function pending2FAOnly(req, res, next) {
  try {
    if (req?.auth?.otpContext === true) return next();
    if (req?.auth?.source === "refresh" && req?.auth?.mfaVerified === false) {
      return next();
    }
  } catch (_) {}
  return res.status(401).json({ message: "2FA context required" });
};
