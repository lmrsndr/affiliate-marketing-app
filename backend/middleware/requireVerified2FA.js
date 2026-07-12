const jwt = require("jsonwebtoken");
const { attachUserFromClaims } = require("./authUser");

/**
 * Post-MFA gate.
 *
 * A request is accepted only when:
 * 1. a valid access or refresh token exists;
 * 2. that token was issued with mfaVerified=true; and
 * 3. the current user record still has an MFA method enabled.
 *
 * The third check immediately invalidates historical tokens that were
 * incorrectly issued as MFA-verified before an administrator configured 2FA.
 */
module.exports = async (req, res, next) => {
  const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;

  let claims = req.auth?.claims || null;
  let mfaVerified = Boolean(req.auth?.mfaVerified);
  let source = req.auth?.source || null;

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

    const user = attached.user;
    const hasEnabledMfa = Boolean(user.twoFA?.enabled || user.email2FA?.enabled);

    if (!hasEnabledMfa) {
      return res.status(403).json({
        message: "Two-factor authentication must be configured",
        reason: "MFA_SETUP_REQUIRED",
      });
    }

    return next();
  } catch (error) {
    console.error("requireVerified2FA user lookup failed:", error);
    return res.status(500).json({
      ok: false,
      message: "Auth lookup failed",
      reason: "AUTH_LOOKUP_FAILED",
    });
  }
};
