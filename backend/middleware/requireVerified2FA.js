const jwt = require('jsonwebtoken');

/** Post-MFA gate: requires mfaVerified === true; TOTP for admin/partner. */
module.exports = (req, res, next) => {
  const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;

  let claims = req.auth?.claims || null;
  let mfaVerified = req.auth?.mfaVerified || false;

  // ─────────────────────────────────────────────────────────────
  // 1) Try access token first (cookie or Bearer header)
  // ─────────────────────────────────────────────────────────────
  if (!claims) {
    try {
      const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const access = (req.cookies && req.cookies.authCookie) || bearer || "";
      if (access) {
        const decoded = jwt.verify(access, JWT_SECRET);
        claims = decoded;
        mfaVerified = !!decoded.mfaVerified;
      }
    } catch {
      claims = null;
      mfaVerified = false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2) Fallback to refresh token if no valid access token
  //    (allows the client to be "logged in" and then refresh)
  // ─────────────────────────────────────────────────────────────
  if (!claims) {
    try {
      const refresh = req.cookies && req.cookies.refreshCookie;
      if (refresh) {
        const decoded = jwt.verify(refresh, JWT_REFRESH_SECRET);
        claims = decoded;
        mfaVerified = !!decoded.mfaVerified;
      }
    } catch {
      claims = null;
      mfaVerified = false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3) No valid token at all → 401 so client can /auth/refresh
  // ─────────────────────────────────────────────────────────────
  if (!claims) {
    return res.status(401).json({ ok: false, message: "No auth", reason: "NO_AUTH" });
  }

  // ─────────────────────────────────────────────────────────────
  // 4) Logged in but MFA not verified → 403 (unchanged semantics)
  // ─────────────────────────────────────────────────────────────
  if (!mfaVerified) {
    return res.status(403).json({ message: "MFA required", reason: "MFA_REQUIRED" });
  }

  // Keep req.auth shape compatible with existing code that reads req.auth?.claims
  req.auth = Object.assign({}, req.auth, { claims, mfaVerified: true });

  // ─────────────────────────────────────────────────────────────
  // 5) Role / 2FA policy (UNCHANGED)
  // ─────────────────────────────────────────────────────────────
  const user =
    req.user || { role: claims.role, twoFA: { enabled: false }, email2FA: { verified: false } };

  if ((user.role === "admin" || user.role === "partner") && !user.twoFA?.enabled) {
    return res.status(403).json({ message: "TOTP required for this role", reason: "TOTP_REQUIRED" });
  }

  if (user.role !== "admin" && user.role !== "partner") {
    if (!user.twoFA?.enabled && !user.email2FA?.verified) {
      return res.status(403).json({ message: "Email 2FA required", reason: "EMAIL_2FA_REQUIRED" });
    }
  }

  return next();
};
