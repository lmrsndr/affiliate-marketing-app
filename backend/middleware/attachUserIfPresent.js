const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;

/** Non-blocking cookie attach (no MFA enforcement here) */
module.exports = async function attachUserIfPresent(req, _res, next) {
  req.auth = { isAuthenticated: false, mfaVerified: false, claims: null, source: null };

  // Access cookie
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

  // Refresh cookie
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
