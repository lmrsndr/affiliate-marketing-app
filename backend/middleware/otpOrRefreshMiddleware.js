const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Accept any ONE of:
 *  - Cookie "otpTicket" (JWT_OTP_SECRET or JWT_SECRET)
 *  - Cookie "refreshCookie" (JWT_REFRESH_SECRET)
 *  - Cookie "authCookie" (JWT_SECRET)
 *  - Authorization: Bearer <accessToken> (JWT_SECRET)
 *
 * This is ONLY for the pre-MFA endpoints (send/resend/verify 2FA).
 * We DO NOT require mfaVerified===true here by design.
 */
module.exports = async function otpOrRefresh(req, res, next) {
  const {
    JWT_SECRET,
    JWT_REFRESH_SECRET,
    JWT_OTP_SECRET,
    DEBUG_2FA_CONTEXT,
  } = process.env;

  const log = (...a) => { if (DEBUG_2FA_CONTEXT) console.log("[2FA ctx]", ...a); };

  try {
    let claims = null;
    let source = null;

    // 1) otpTicket cookie
    const otpTicket = req.cookies?.otpTicket;
    if (!claims && otpTicket) {
      try {
        claims = jwt.verify(otpTicket, JWT_OTP_SECRET || JWT_SECRET);
        source = "otpTicket";
        log("verified via otpTicket", { sub: claims?.sub });
      } catch (e) {
        log("otpTicket verify failed:", e.message);
      }
    }

    // 2) refreshCookie cookie
    const refreshCookie = req.cookies?.refreshCookie;
    if (!claims && refreshCookie) {
      try {
        claims = jwt.verify(refreshCookie, JWT_REFRESH_SECRET);
        source = "refreshCookie";
        log("verified via refreshCookie", { id: claims?.id });
      } catch (e) {
        log("refresh verify failed:", e.message);
      }
    }

    // 3) authCookie cookie (access token)
    const authCookie = req.cookies?.authCookie;
    if (!claims && authCookie) {
      try {
        claims = jwt.verify(authCookie, JWT_SECRET);
        source = "authCookie";
        log("verified via authCookie", { id: claims?.id, mfa: claims?.mfaVerified });
      } catch (e) {
        log("authCookie verify failed:", e.message);
      }
    }

    // 4) Authorization: Bearer <access token>
    if (!claims) {
      const hAuth = req.get("authorization") || req.get("Authorization");
      if (hAuth && hAuth.startsWith("Bearer ")) {
        const token = hAuth.slice(7);
        try {
          claims = jwt.verify(token, JWT_SECRET);
          source = "Authorization";
          log("verified via Authorization header", { id: claims?.id, mfa: claims?.mfaVerified });
        } catch (e) {
          log("Authorization header verify failed:", e.message);
        }
      }
    }

    if (!claims) {
      log("no acceptable 2FA context found");
      return res.status(401).json({ message: "Unauthorized (2FA context required)" });
    }

    // Resolve user
    const userId = claims.id || claims.sub;
    if (!userId) {
      log("claims missing id/sub");
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      log("user not found", userId);
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = user;
    req.auth = {
      isAuthenticated: true,
      mfaVerified: !!claims.mfaVerified,
      source,
      claims,
    };
    return next();
  } catch (err) {
    console.error("otpOrRefresh error:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
