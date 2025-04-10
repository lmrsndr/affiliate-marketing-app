const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * ✅ Middleware to protect routes by verifying JWT access token from Authorization header
 */
module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("❌ [AUTH ERROR] No token provided in Authorization header.");
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      _id: decoded.id, // For Mongoose lookups
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      twoFAVerified: decoded.twoFAVerified || false
    };

    console.log(`🔐 [AUTH] Verified user: ${decoded.email} | Role: ${decoded.role}`);
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      console.warn("⚠️ [AUTH WARNING] Access token expired.");
      return res.status(401).json({ message: "Access token expired. Please refresh." });
    }

    console.error("❌ [AUTH ERROR] Token verification failed:", err.message);
    return res.status(403).json({ message: "Invalid token. Please log in again." });
  }
};
