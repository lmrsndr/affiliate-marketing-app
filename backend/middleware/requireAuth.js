const jwt = require("jsonwebtoken");

/**
 * Minimal "logged-in" gate. Accepts cookie or Authorization header.
 * Does NOT require MFA — pair with requireVerified2FA when needed.
 */
module.exports = (req, res, next) => {
  if (req.user || (req.auth && req.auth.isAuthenticated)) return next();

  const token =
    (req.cookies && req.cookies.authCookie) ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = { isAuthenticated: true, mfaVerified: !!claims.mfaVerified, claims, source: "fallback" };
    req.user = req.user || { _id: claims.id, role: claims.role, email: claims.email };
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
