const jwt = require('jsonwebtoken');

/**
 * Post-MFA gate: requires mfaVerified === true.
 * For admin/partner: enforces TOTP app; regular users may use email 2FA (verified).
 */
module.exports = (req, res, next) => {
  // prefer upstream claims
  let claims = req.auth?.claims;
  let mfaVerified = req.auth?.mfaVerified;

  // fallback decode
  if (!claims) {
    try {
      const t = (req.cookies && req.cookies.authCookie) || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (t) {
        claims = jwt.verify(t, process.env.JWT_SECRET);
        mfaVerified = !!claims.mfaVerified;
      }
    } catch {}
  }

  if (!claims || !mfaVerified) {
    return res.status(403).json({ message: "MFA required", reason: "MFA_REQUIRED" });
  }

  const user = req.user || { role: claims.role, twoFA: { enabled: false }, email2FA: { verified: false } };

  // Enforce TOTP for admin/partner roles
  if ((user.role === "admin" || user.role === "partner") && !user.twoFA?.enabled) {
    return res.status(403).json({ message: "TOTP required for this role", reason: "TOTP_REQUIRED" });
  }

  // Regular users must at least have email 2FA verified if TOTP not enabled
  if (user.role !== "admin" && user.role !== "partner") {
    if (!user.twoFA?.enabled && !user.email2FA?.verified) {
      return res.status(403).json({ message: "Email 2FA required", reason: "EMAIL_2FA_REQUIRED" });
    }
  }

  return next();
};
