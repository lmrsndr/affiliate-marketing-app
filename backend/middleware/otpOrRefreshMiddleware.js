const jwt = require("jsonwebtoken");
const { getUserById } = require("../services/userService");

/**
 * Accepts any one of:
 *  - Cookie "otpTicket" (JWT_OTP_SECRET or JWT_SECRET)
 *  - Cookie "refreshCookie" (JWT_REFRESH_SECRET)
 *  - Cookie "authCookie" (JWT_SECRET)
 *  - Authorization: Bearer <accessToken> (JWT_SECRET)
 *
 * Does NOT enforce MFA completion (intended for pre-MFA endpoints).
 * Avoids duplicate DB hits: if req.user/res.locals.user already exists, it won't fetch again.
 */
module.exports = async function otpOrRefresh(req, res, next) {
  const { JWT_SECRET, JWT_REFRESH_SECRET, JWT_OTP_SECRET, DEBUG_2FA_CONTEXT } = process.env;
  const log = (...a) => { if (DEBUG_2FA_CONTEXT) console.log("[2FA ctx]", ...a); };

  try {
    let claims = null;
    let source = null;

    const tryVerify = (t, secret) => { try { return t ? jwt.verify(t, secret) : null; } catch { return null; } };

    // 1) otpTicket cookie
    if (!claims) {
      const c = req.cookies?.otpTicket;
      const v = tryVerify(c, JWT_OTP_SECRET || JWT_SECRET);
      if (v) { claims = v; source = "otpTicket"; log("via otpTicket", { sub: v?.sub }); }
    }

    // 2) refreshCookie
    if (!claims) {
      const c = req.cookies?.refreshCookie;
      const v = tryVerify(c, JWT_REFRESH_SECRET);
      if (v) { claims = v; source = "refreshCookie"; log("via refreshCookie", { id: v?.id }); }
    }

    // 3) authCookie
    if (!claims) {
      const c = req.cookies?.authCookie;
      const v = tryVerify(c, JWT_SECRET);
      if (v) { claims = v; source = "authCookie"; log("via authCookie", { id: v?.id, mfa: v?.mfaVerified }); }
    }

    // 4) Authorization header
    if (!claims) {
      const h = req.get("authorization") || req.get("Authorization");
      if (h && h.startsWith("Bearer ")) {
        const token = h.slice(7);
        const v = tryVerify(token, JWT_SECRET);
        if (v) { claims = v; source = "Authorization"; log("via Authorization", { id: v?.id, mfa: v?.mfaVerified }); }
      }
    }

    if (!claims) {
      return res.status(401).json({ message: "Unauthorized (2FA context required)" });
    }

    const userId = claims.id || claims.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Reuse existing attachment, otherwise fetch with cache
    if (!req.user && !res.locals.user) {
      const user = await getUserById(userId, { projection: { password: 0 } });
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      req.user = user;
      res.locals.user = user;
    }

    req.auth = {
      isAuthenticated: true,
      mfaVerified: !!claims.mfaVerified,
      source,
      claims,
      otpContext: source === "otpTicket" ? true : undefined,
    };

    return next();
  } catch (err) {
    console.error("otpOrRefresh error:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
