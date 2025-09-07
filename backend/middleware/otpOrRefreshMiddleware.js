const jwt = require('jsonwebtoken');
const User = require('../models/User');

const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_OTP_SECRET = JWT_SECRET,
} = process.env;

/** Pre-MFA guard: accept otpTicket OR a pre-MFA access/refresh cookie. */
module.exports = async function otpOrRefreshMiddleware(req, res, next) {
  try {
    // 1) otpTicket
    try {
      const otp = req.cookies?.otpTicket;
      if (otp) {
        const c = jwt.verify(otp, JWT_OTP_SECRET);
        if (c?.purpose === "otp" && c?.sub) {
          const user = await User.findById(c.sub);
          if (!user) return res.status(404).json({ message: "User not found" });
          req.user = user;
          req.auth = { isAuthenticated: true, mfaVerified: false, claims: { id: user._id }, source: "otpTicket" };
          return next();
        }
      }
    } catch {}

    // 2) pre-MFA access cookie
    try {
      const t = req.cookies?.authCookie;
      if (t) {
        const claims = jwt.verify(t, JWT_SECRET);
        if (!claims.mfaVerified) {
          const user = await User.findById(claims.id);
          if (!user) return res.status(404).json({ message: "User not found" });
          req.user = user;
          req.auth = { isAuthenticated: true, mfaVerified: false, claims, source: "access" };
          return next();
        }
      }
    } catch {}

    // 3) pre-MFA refresh cookie
    try {
      const t = req.cookies?.refreshCookie;
      if (t) {
        const claims = jwt.verify(t, JWT_REFRESH_SECRET);
        if (!claims.mfaVerified) {
          const user = await User.findById(claims.id);
          if (!user) return res.status(404).json({ message: "User not found" });
          req.user = user;
          req.auth = { isAuthenticated: true, mfaVerified: false, claims, source: "refresh" };
          return next();
        }
      }
    } catch {}

    return res.status(401).json({ message: 'Unauthorized (2FA context required)' });
  } catch (err) {
    console.error('❌ otpOrRefreshMiddleware error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
