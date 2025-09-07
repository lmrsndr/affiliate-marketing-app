// middleware/attachUserIfPresent.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
} = process.env;

// Best-effort: attach req.user & req.auth if we can decode the cookie token.
// Does NOT throw; never blocks requests.
module.exports = async function attachUserIfPresent(req, _res, next) {
  req.auth = { isAuthenticated: false, source: null, mfaVerified: false, claims: null };

  try {
    const access = req.cookies?.authCookie;
    if (access) {
      const claims = jwt.verify(access, JWT_SECRET);
      req.auth = { isAuthenticated: true, source: "access", mfaVerified: !!claims.mfaVerified, claims };
      // Load fresh user doc (lean for speed)
      const user = await User.findById(claims.id).lean();
      if (user) req.user = user;
      return next();
    }
  } catch (_) {
    // ignore and try refresh cookie below
  }

  try {
    const refresh = req.cookies?.refreshCookie;
    if (refresh) {
      const claims = jwt.verify(refresh, JWT_REFRESH_SECRET);
      req.auth = { isAuthenticated: true, source: "refresh", mfaVerified: !!claims.mfaVerified, claims };
      const user = await User.findById(claims.id).lean();
      if (user) req.user = user;
      return next();
    }
  } catch (_) {
    // ignore
  }

  // Nothing attached
  return next();
};
