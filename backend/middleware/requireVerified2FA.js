const jwt = require('jsonwebtoken');
const { attachUserFromClaims } = require("./authUser");

/** Post-MFA gate: requires mfaVerified === true; TOTP for admin/partner. */
module.exports = async (req, res, next) => {
  const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;

  let claims = req.auth?.claims || null;
  let mfaVerified = req.auth?.mfaVerified || false;
  let source = req.auth?.source || null;

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
        source = bearer ? "authorization" : "auth";
      }
    } catch {
      claims = null;
      mfaVerified = false;
      source = null;
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
        source = "refresh";
      }
    } catch {
      claims = null;
      mfaVerified = false;
      source = null;
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

  let user;
  try {
    const attached = await attachUserFromClaims(req, claims, source, {
      isAuthenticated: true,
    });
    user = attached.user;

    if (!attached.found) {
      return res.status(401).json({ ok: false, message: "Invalid user", reason: "USER_NOT_FOUND" });
    }
  } catch (err) {
    console.error("requireVerified2FA user lookup failed:", err);
    return res.status(500).json({ ok: false, message: "Auth lookup failed", reason: "AUTH_LOOKUP_FAILED" });
  }

  // ─────────────────────────────────────────────────────────────
  // 5) Role / 2FA policy (UNCHANGED)
  // ─────────────────────────────────────────────────────────────
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
