const jwt = require("jsonwebtoken");
const { attachUserFromClaims } = require("./authUser");

/**
 * Post-MFA gate.
 *
 * Access is granted when a valid access or refresh token contains
 * `mfaVerified: true`. The login/verification flow is responsible for deciding
 * which MFA method is acceptable. This middleware must not require TOTP again
 * after email 2FA or another approved method has already produced a verified
 * session.
 */
module.exports = async (req, res, next) => {
  const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;

  let claims = req.auth?.claims || null;
  let mfaVerified = req.auth?.mfaVerified || false;
  let source = req.auth?.source || null;

  // Try access token first (cookie or Bearer header).
  if (!claims) {
    try {
      const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      const access = req.cookies?.authCookie || bearer || "";
      if (access) {
        const decoded = jwt.verify(access, JWT_SECRET);
        claims = decoded;
        mfaVerified = Boolean(decoded.mfaVerified);
        source = bearer ? "authorization" : "auth";
      }
    } catch {
      claims = null;
      mfaVerified = false;
      source = null;
    }
  }

  // Fall back to the refresh token when the access token is absent or expired.
  if (!claims) {
    try {
      const refresh = req.cookies?.refreshCookie;
      if (refresh) {
        const decoded = jwt.verify(refresh, JWT_REFRESH_SECRET);
        claims = decoded;
        mfaVerified = Boolean(decoded.mfaVerified);
        source = "refresh";
      }
    } catch {
      claims = null;
      mfaVerified = false;
      source = null;
    }
  }

  if (!claims) {
    return res.status(401).json({ ok: false, message: "No auth", reason: "NO_AUTH" });
  }

  if (!mfaVerified) {
    return res.status(403).json({ message: "MFA required", reason: "MFA_REQUIRED" });
  }

  try {
    const attached = await attachUserFromClaims(req, claims, source, {
      isAuthenticated: true,
    });

    if (!attached.found) {
      return res.status(401).json({ ok: false, message: "Invalid user", reason: "USER_NOT_FOUND" });
    }
  } catch (error) {
    console.error("requireVerified2FA user lookup failed:", error);
    return res.status(500).json({ ok: false, message: "Auth lookup failed", reason: "AUTH_LOOKUP_FAILED" });
  }

  return next();
};
