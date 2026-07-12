const express = require("express");
const jwt = require("jsonwebtoken");

const passport = require("../config/passport");
const runtime = require("../config/runtime");
const { authCookieOptions } = require("../config/http");
const User = require("../models/User");

const router = express.Router();
const redirectToFrontend = (path) => `${runtime.frontendOrigin}${path}`;

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: redirectToFrontend("/login?error=unauthorized"),
    session: false,
  }),
  async (req, res) => {
    try {
      const cookieOptions = authCookieOptions(req);
      const requires2FA = Boolean(req.user?.twoFA?.enabled || req.user?.email2FA?.enabled);

      if (requires2FA) {
        res.clearCookie("authCookie", cookieOptions);
        res.clearCookie("refreshCookie", cookieOptions);

        await User.updateOne(
          { _id: req.user._id },
          { $set: { "email2FA.verified": false } }
        ).catch((error) => console.warn("Unable to reset email 2FA state:", error.message));

        const preRefresh = jwt.sign(
          {
            id: req.user._id,
            role: req.user.role,
            mfaVerified: false,
            purpose: "pre2fa",
          },
          runtime.jwtRefreshSecret,
          { expiresIn: "30m" }
        );

        const otpTicket = jwt.sign(
          { sub: String(req.user._id), purpose: "otp" },
          runtime.jwtOtpSecret,
          { expiresIn: "5m" }
        );

        res.cookie("refreshCookie", preRefresh, authCookieOptions(req, { maxAge: 30 * 60 * 1000 }));
        res.cookie("otpTicket", otpTicket, authCookieOptions(req, { maxAge: 5 * 60 * 1000 }));
        return res.redirect(redirectToFrontend("/setup-2fa?oauth=1"));
      }

      const accessToken = jwt.sign(
        {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          mfaVerified: true,
        },
        runtime.jwtSecret,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign(
        { id: req.user._id, role: req.user.role, mfaVerified: true },
        runtime.jwtRefreshSecret,
        { expiresIn: "7d" }
      );

      res.cookie("authCookie", accessToken, authCookieOptions(req, { maxAge: 15 * 60 * 1000 }));
      res.cookie("refreshCookie", refreshToken, authCookieOptions(req, { maxAge: 7 * 24 * 60 * 60 * 1000 }));
      return res.redirect(redirectToFrontend("/auth/callback"));
    } catch (error) {
      console.error("Google OAuth callback failed:", error);
      return res.redirect(redirectToFrontend("/login?error=server"));
    }
  }
);

module.exports = router;
