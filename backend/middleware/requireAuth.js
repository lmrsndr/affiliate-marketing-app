const jwt = require("jsonwebtoken");
const { setAuthState, userFromClaims } = require("./authUser");

/** Logged-in gate (cookie or header). Does NOT require MFA. */
module.exports = (req, res, next) => {
  if (req.user || (req.auth && req.auth.isAuthenticated)) return next();

  const token =
    (req.cookies && req.cookies.authCookie) ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    const user = req.user || userFromClaims(claims);
    setAuthState(req, user, claims, "fallback");
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
