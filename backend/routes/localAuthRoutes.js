const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { authCookieOptions } = require("../config/http");

const router = express.Router();
const { JWT_SECRET, JWT_REFRESH_SECRET, JWT_OTP_SECRET } = process.env;

router.post("/register", (_req, res) => {
  return res.status(403).json({
    ok: false,
    message: "Public registration is disabled",
  });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user || user.localEnabled === false || !user.password) {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Administrator access only" });
    }

    // Administrators must complete a fresh second-factor challenge on every login.
    // Email 2FA is the mandatory fallback even when an authenticator is also configured.
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          "email2FA.enabled": true,
          "email2FA.verified": false,
          twoFAVerified: false,
        },
      }
    );

    res.clearCookie("authCookie", authCookieOptions(req));
    res.clearCookie("refreshCookie", authCookieOptions(req));

    const preRefresh = jwt.sign(
      { id: user._id, role: user.role, mfaVerified: false, purpose: "pre2fa" },
      JWT_REFRESH_SECRET,
      { expiresIn: "30m" }
    );
    res.cookie(
      "refreshCookie",
      preRefresh,
      authCookieOptions(req, { maxAge: 30 * 60 * 1000 })
    );

    const otpTicket = jwt.sign(
      { sub: String(user._id), purpose: "otp" },
      JWT_OTP_SECRET || JWT_SECRET,
      { expiresIn: 300 }
    );
    res.cookie(
      "otpTicket",
      otpTicket,
      authCookieOptions(req, { maxAge: 5 * 60 * 1000 })
    );

    return res.json({ ok: true, need2fa: true, method: "email" });
  } catch (error) {
    console.error("local/login error:", error);
    return res.status(500).json({ ok: false, message: "server_error" });
  }
});

module.exports = router;
