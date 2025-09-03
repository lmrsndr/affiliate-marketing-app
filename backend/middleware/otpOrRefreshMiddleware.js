const jwt = require('jsonwebtoken');
const User = require('../models/User');

const {
  NODE_ENV = 'development',
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_OTP_SECRET = JWT_SECRET,
} = process.env;

/**
 * Resolve a "pending-2FA" user using either:
 *  - otpTicket cookie (preferred), or
 *  - refreshCookie minted pre-2FA (decoded with JWT_REFRESH_SECRET)
 *
 * Attaches req.user (a mongoose doc) on success.
 */
module.exports = async function otpOrRefreshMiddleware(req, res, next) {
  try {
    const cookies = req.cookies || {};
    const otpTicket = cookies.otpTicket;
    const refresh = cookies.refreshCookie;

    let userId = null;

    // 1) Prefer otpTicket
    if (otpTicket) {
      try {
        const p = jwt.verify(otpTicket, JWT_OTP_SECRET);
        if (p && p.purpose === 'otp' && p.sub) userId = p.sub;
      } catch { /* ignore */ }
    }

    // 2) Fallback: a pre-2FA refreshCookie (mfaVerified should be false/missing)
    if (!userId && refresh) {
      try {
        const p = jwt.verify(refresh, JWT_REFRESH_SECRET);
        // We only permit this path if token is not yet 2FA verified
        if (p && p.id && !p.mfaVerified) userId = p.id;
      } catch { /* ignore */ }
    }

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized (2FA context required)' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    req.user = user; // attach the doc
    next();
  } catch (err) {
    console.error('❌ otpOrRefreshMiddleware error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
