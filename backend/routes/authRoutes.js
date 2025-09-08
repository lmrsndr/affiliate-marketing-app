const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();

const ctrl = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const {
  NODE_ENV = "production",
  COOKIE_DOMAIN = ".bundlebee.co.uk",
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_OTP_SECRET,
  FRONTEND_URL = "https://bundlebee.co.uk",
} = process.env;

const baseCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  domain: COOKIE_DOMAIN,
  path: "/",
};

const setCookie = (res, name, value, extra = {}) =>
  res.cookie(name, value, { ...baseCookie, ...extra });

const clearCookie = (res, name) =>
  res.clearCookie(name, { ...baseCookie });

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}/login?error=OAuthFailed`,
    session: false,
  }),
  async (req, res) => {
    try {
      console.log("🔑 [OAuth Callback] Reached backend route");

      if (!req.user) {
        console.warn("⚠️ [OAuth Callback] No req.user from passport");
        return res.redirect(`${FRONTEND_URL}/login?error=unauthorized`);
      }

      console.log("👤 [OAuth Callback] User:", {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        twoFA: req.user.twoFA,
        email2FA: req.user.email2FA,
      });

      const deviceTrusted = ctrl.isTrustedDevice(req);
      const twoFAEnabled =
        !!(req.user?.twoFA?.enabled || req.user?.email2FA?.verified);

      console.log("📊 [OAuth Callback] deviceTrusted:", deviceTrusted);
      console.log("📊 [OAuth Callback] twoFAEnabled:", twoFAEnabled);

      if (twoFAEnabled && !deviceTrusted) {
        console.log("➡️ [OAuth Callback] 2FA required, issuing otpTicket");

        const otpToken = jwt.sign(
          { sub: req.user._id.toString(), purpose: "otp" },
          JWT_OTP_SECRET || JWT_SECRET,
          { expiresIn: "5m" }
        );

        clearCookie(res, "authCookie");
        setCookie(res, "otpTicket", otpToken, { maxAge: 5 * 60 * 1000 });

        console.log("🍪 [OAuth Callback] otpTicket cookie set");
        return res.redirect(`${FRONTEND_URL}/setup-2fa?oauth=1`);
      }

      console.log("✅ [OAuth Callback] No 2FA required, minting full tokens");

      const accessToken = jwt.sign(
        { id: req.user._id, email: req.user.email, role: req.user.role, mfaVerified: true },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        { id: req.user._id, role: req.user.role, mfaVerified: true },
        JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      setCookie(res, "authCookie", accessToken, { maxAge: 15 * 60 * 1000 });
      setCookie(res, "refreshCookie", refreshToken, { maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: "Strict" });

      console.log("🍪 [OAuth Callback] authCookie + refreshCookie set");
      return res.redirect(`${FRONTEND_URL}/`);
    } catch (err) {
      console.error("❌ [OAuth Callback] Error:", err);
      return res.redirect(`${FRONTEND_URL}/login?error=server`);
    }
  }
);

module.exports = router;
