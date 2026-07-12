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
      if (req.user?.role !== "admin") {
        return res.redirect(redirectToFrontend("/?error=admin-only"));
      }

      const cookieOptions = authCookieOptions(req);

      // Google proves the primary identity only. Administrators must still
      // complete BundleBee email 2FA before receiving a full session.
      await User.updateOne(
        { _id: req.user._id },
        {
          $set: {
            "email2FA.enabled": true,
            "email2FA.verified": false,
            twoFAVerified: false,
          },
        }
      );

      res.clearCookie("authCookie", cookieOptions);
      res.clearCookie("refreshCookie", cookieOptions);

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
      return res.redirect(redirectToFrontend("/verify-2fa"));
    } catch (error) {
      console.error("Google OAuth callback failed:", error);
      return res.redirect(redirectToFrontend("/login?error=server"));
    }
  }
);

module.exports = router;
