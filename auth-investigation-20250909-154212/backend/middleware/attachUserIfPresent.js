const jwt = require("jsonwebtoken");
const { getUserById } = require("../services/userService");

const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;

/**
 * Non-blocking auth attach:
 * - Verifies access or refresh cookies if present.
 * - Fetches user at most once (cached) and stores on req.user + res.locals.user.
 * - Never re-fetches inside the same request.
 */
module.exports = async function attachUserIfPresent(req, res, next) {
  req.auth = req.auth || { isAuthenticated: false, mfaVerified: false, claims: null, source: null };

  // Already attached earlier in this request? skip
  if (res.locals.user) return next();

  const tryVerify = (t, secret) => {
    try { return t ? jwt.verify(t, secret) : null; } catch { return null; }
  };

  let claims = null;
  let source = null;

  // Prefer access cookie
  const access = req.cookies?.authCookie;
  const accessClaims = tryVerify(access, JWT_SECRET);
  if (accessClaims) {
    claims = accessClaims;
    source = "access";
  }

  // Fall back to refresh cookie
  if (!claims) {
    const refresh = req.cookies?.refreshCookie;
    const refreshClaims = tryVerify(refresh, JWT_REFRESH_SECRET);
    if (refreshClaims) {
      claims = refreshClaims;
      source = "refresh";
    }
  }

  // If we have claims, attach user (single cached call)
  if (claims?.id) {
    req.auth = { isAuthenticated: true, mfaVerified: !!claims.mfaVerified, claims, source };
    const user = await getUserById(claims.id, { projection: { password: 0 } });
    if (user) {
      req.user = user;
      res.locals.user = user;
    }
  }

  return next();
};
