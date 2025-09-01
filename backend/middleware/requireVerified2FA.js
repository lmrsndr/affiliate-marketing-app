/**
 * Require verified 2FA for protected routes and enforce policy by role.
 *
 * - Gate 1 (must pass): token must have mfaVerified === true
 * - Gate 2 (policy):    admin/partner must use TOTP; users may use email 2FA (but must be verified)
 *
 * Assumes a JWT auth middleware has already populated req.user from the access token.
 * If not, try to decode from cookie/header below.
 */
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Try to trust an upstream auth middleware. If not present, decode minimally.
  if (!req.user) {
    const token =
      (req.cookies && req.cookies.authCookie) ||
      (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  const { role, mfaVerified, twoFA, email2FA } = req.user || {};

  // ── Gate 1: hard requirement – the **token** must be minted post-2FA
  if (!mfaVerified) {
    return res.status(401).json({
      message: "2FA required",
      reason: "MFA_NOT_VERIFIED"
    });
  }

  // ── Gate 2: policy by role/type (keeps your existing logic)
  // Admins & Partners must use TOTP app-based 2FA
  if ((role === "admin" || role === "partner") && !twoFA?.enabled) {
    return res.status(403).json({
      message: "Please set up app-based 2FA",
      reason: "TOTP_REQUIRED"
    });
  }

  // Users can use email 2FA, but it must be verified
  if (!twoFA?.enabled && !email2FA?.verified) {
    return res.status(403).json({
      message: "Please verify your email 2FA code",
      reason: "EMAIL_2FA_REQUIRED"
    });
  }

  next();
};
