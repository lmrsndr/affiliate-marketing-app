module.exports = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  const { role, twoFA, email2FA } = req.user;

  // Admins & Partners must use TOTP app-based 2FA
  if ((role === "admin" || role === "partner") && !twoFA?.enabled) {
    return res.status(403).json({
      message: "Please set up app-based 2FA",
      reason: "TOTP_REQUIRED"
    });
  }

  // Users can use email 2FA, but must be verified
  if (!twoFA?.enabled && !email2FA?.verified) {
    return res.status(403).json({
      message: "Please verify your email 2FA code",
      reason: "EMAIL_2FA_REQUIRED"
    });
  }

  next();
};
