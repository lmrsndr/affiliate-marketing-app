/**
 * Role-based access middleware
 * Usage:
 *    - roleMiddleware("admin")
 *    - roleMiddleware(["admin", "partner"])
 */
module.exports = function roleMiddleware(requiredRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ msg: "Access denied. No user role found." });
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ msg: "Access denied. Insufficient permissions." });
    }

    next();
  };
};
