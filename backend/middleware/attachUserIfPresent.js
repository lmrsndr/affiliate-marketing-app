const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function attachUserIfPresent(req, res, next) {
  const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;
  req.auth = { isAuthenticated: false, mfaVerified: false, source: null };

  const authCookie = req.cookies?.authCookie;
  const refreshCookie = req.cookies?.refreshCookie;

  // 1) Try access token
  if (authCookie) {
    try {
      const payload = jwt.verify(authCookie, JWT_SECRET);
      req.auth = { ...payload, isAuthenticated: true, source: "auth" };
      if (payload?.id) {
        res.locals.user = await User.findById(payload.id).lean();
      }
      return next();
    } catch (e) {
      // fall through to refresh
    }
  }

  // 2) Try refresh token (mfa must be verified)
  if (refreshCookie) {
    try {
      const payload = jwt.verify(refreshCookie, JWT_REFRESH_SECRET);
      req.auth = { ...payload, isAuthenticated: !!payload.mfaVerified, source: "refresh" };
      if (payload?.id) {
        res.locals.user = await User.findById(payload.id).lean();
      }
      return next();
    } catch (e) {
      // invalid refresh → unauthenticated
    }
  }

  return next();
};
