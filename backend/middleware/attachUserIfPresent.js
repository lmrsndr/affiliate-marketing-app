const jwt = require("jsonwebtoken");
const { attachUserFromClaims } = require("./authUser");

module.exports = async function attachUserIfPresent(req, res, next) {
  const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;
  req.auth = { isAuthenticated: false, mfaVerified: false, source: null };

  const authCookie = req.cookies?.authCookie;
  const refreshCookie = req.cookies?.refreshCookie;

  // 1) Try access token
  if (authCookie) {
    try {
      const payload = jwt.verify(authCookie, JWT_SECRET);
      const { user } = await attachUserFromClaims(req, payload, "auth");
      res.locals.user = user || null;
      return next();
    } catch (e) {
      // fall through to refresh
    }
  }

  // 2) Try refresh token (mfa must be verified)
  if (refreshCookie) {
    try {
      const payload = jwt.verify(refreshCookie, JWT_REFRESH_SECRET);
      const { user } = await attachUserFromClaims(req, payload, "refresh", {
        isAuthenticated: !!payload.mfaVerified,
      });
      res.locals.user = user || null;
      return next();
    } catch (e) {
      // invalid refresh → unauthenticated
    }
  }

  return next();
};
