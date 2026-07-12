const jwt = require("jsonwebtoken");
const { attachUserFromClaims } = require("./authUser");
const { authenticateAccessToken } = require("../services/supabaseAuth");

/**
 * Transitional post-MFA gate.
 *
 * Supabase Auth is checked first whenever a Bearer token is supplied. Existing
 * BundleBee cookie/JWT sessions remain available temporarily as a rollback
 * path until the Supabase migration has been proven in production.
 */
module.exports = async (req, res, next) => {
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();

  if (bearer) {
    try {
      const session = await authenticateAccessToken(bearer);
      if (session.role !== "admin") {
        return res.status(403).json({ message: "Administrator access only", reason: "ADMIN_REQUIRED" });
      }
      if (session.aal !== "aal2") {
        return res.status(403).json({ message: "Authenticator verification required", reason: "MFA_AAL2_REQUIRED" });
      }

      req.supabase = { ...session, accessToken: bearer };
      req.user = {
        id: session.user.id,
        _id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.email,
        role: "admin",
      };
      req.auth = {
        ...(req.auth || {}),
        isAuthenticated: true,
        mfaVerified: true,
        source: "supabase",
      };
      return next();
    } catch (error) {
      if (error.status && error.status !== 401) {
        return res.status(error.status).json({
          message: error.message || "Supabase authentication failed",
          reason: "SUPABASE_AUTH_FAILED",
        });
      }
      // Invalid Supabase bearer tokens must not be reinterpreted as legacy JWTs.
      return res.status(401).json({ message: "Supabase authentication required", reason: "SUPABASE_AUTH_REQUIRED" });
    }
  }

  const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;
  let claims = req.auth?.claims || null;
  let mfaVerified = Boolean(req.auth?.mfaVerified);
  let source = req.auth?.source || null;

  if (!claims) {
    try {
      const access = req.cookies?.authCookie || "";
      if (access) {
        const decoded = jwt.verify(access, JWT_SECRET);
        claims = decoded;
        mfaVerified = Boolean(decoded.mfaVerified);
        source = "auth";
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
