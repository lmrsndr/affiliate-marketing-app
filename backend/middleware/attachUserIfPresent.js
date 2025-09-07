const jwt = require("jsonwebtoken");
const User = require("../models/User");

const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;

/**
 * Non-blocking helper: attach req.auth (claims, mfaVerified) and req.user if cookies exist.
 * Does NOT enforce login or MFA — use requireAuth / requireVerified2FA for that.
 */
module.exports = async function attachUserIfPresent(req, _res, next) {
  req.auth = { isAuthenticated: false, mfaVerified: false, claims: null, source: null };

  // access cookie
  try {
    const t = req.cookies?.authCookie;
    if (t) {
      const claims = jwt.verify(t, JWT_SECRET);
      req.auth = { isAuthenticated: true, mfaVerified: !!claims.mfaVerified, claims, source: "access" };
      if (!req.user) {
        const user = await User.findById(claims.id).lean();
        if (user) req.user = user;
      }
      return next();
    }
  } catch {}

  // refresh cookie
  try {
    const t = req.cookies?.refreshCookie;
    if (t) {
      const claims = jwt.verify(t, JWT_REFRESH_SECRET);
      req.auth = { isAuthenticated: true, mfaVerified: !!claims.mfaVerified, claims, source: "refresh" };
      if (!req.user) {
        const user = await User.findById(claims.id).lean();
        if (user) req.user = user;
      }
      return next();
    }
  } catch {}

  return next();
};
