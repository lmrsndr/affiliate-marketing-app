const jwt = require("jsonwebtoken");
const User = require("../models/User");

const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_OTP_SECRET,
} = process.env;

/**
 * Accept **either**:
 *  - otpTicket (JWT with purpose:"otp", signed with JWT_OTP_SECRET or JWT_SECRET)
 *  - refreshCookie (JWT with purpose:"pre2fa", mfaVerified:false, signed with JWT_REFRESH_SECRET)
 *
 * On success: attaches req.user (Mongoose doc or plain object) and sets req.pre2fa = true.
 * On failure: 401 Unauthorized.
 */
module.exports = async function otpOrRefresh(req, res, next) {
  try {
    const otp = req.cookies?.otpTicket;
    const pre = req.cookies?.refreshCookie;

    let userId = null;

    if (otp) {
      try {
        const claims = jwt.verify(otp, JWT_OTP_SECRET || JWT_SECRET);
        if (claims && claims.purpose === "otp" && claims.sub) {
          userId = claims.sub;
        }
      } catch (_) {
        /* ignore and try pre2fa */
      }
    }

    if (!userId && pre) {
      try {
        const claims = jwt.verify(pre, JWT_REFRESH_SECRET);
        if (
          claims &&
          claims.purpose === "pre2fa" &&
          claims.mfaVerified === false &&
          claims.id
        ) {
          userId = claims.id;
        }
      } catch (_) {
        /* ignore */
      }
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized (2FA context required)" });
    }

    const u = await (User.findById(userId).lean
      ? User.findById(userId).lean()
      : User.findById(userId));

    if (!u) {
      return res.status(401).json({ message: "Unauthorized (user not found)" });
    }

    req.user = u;
    req.pre2fa = true;
    return next();
  } catch (err) {
    console.error("otpOrRefresh error:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
