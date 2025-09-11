const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_OTP_SECRET,
  NODE_ENV = "production",
} = process.env;

// ───────────────────────────────────────────────────────────────
// Cookie helpers (mirror server.js behavior)
// ───────────────────────────────────────────────────────────────
function getCookieBaseDomain(req) {
  const envDom = process.env.COOKIE_DOMAIN;
  if (envDom && envDom.trim()) return envDom.trim();

  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
  if (host.endsWith(".bundlebee.co.uk") || host === "bundlebee.co.uk") return ".bundlebee.co.uk";
  return undefined;
}
function cookieOpts(req, maxAgeMs) {
  return {
    httpOnly: true,
    secure: true, // Render/Cloudflare terminate TLS
    sameSite: "None",
    domain: getCookieBaseDomain(req),
    path: "/",
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}

// ───────────────────────────────────────────────────────────────
// POST /api/auth/local/register
// body: { email, password, name? }
// ───────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Email and password required" });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ ok: false, message: "User already exists" });

    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hash, // <- store in `password` (matches model below)
      name: name || email.split("@")[0],
      role: "user",
      localEnabled: true,
      twoFAVerified: false,
    });

    return res.status(201).json({ ok: true, user: { id: user._id, email: user.email } });
  } catch (err) {
    console.error("local/register error:", err);
    return res.status(500).json({ ok: false, message: "server_error" });
  }
});

// ───────────────────────────────────────────────────────────────
// POST /api/auth/local/login
// body: { email, password }
//   - If 2FA enabled → issues pre-2FA cookies and returns { need2fa: true }
//   - Else → sets auth/refresh cookies and returns { ok: true }
// ───────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: "Email and password required" });
    }

    // IMPORTANT: select '+password' (schema uses select:false)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user || user.localEnabled === false || !user.password) {
      return res.status(401).json({ ok: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ ok: false, message: "Invalid credentials" });

    const twoFAEnabled = !!(user.twoFA?.enabled || user.email2FA?.enabled);

    if (twoFAEnabled) {
      // Pre-2FA: no full session yet
      res.clearCookie("authCookie", cookieOpts(req));
      res.clearCookie("refreshCookie", cookieOpts(req));

      try {
        await User.updateOne({ _id: user._id }, { $set: { "email2FA.verified": false } });
      } catch (e) {
        console.warn("email2FA reset failed:", e?.message || e);
      }

      const preRefresh = jwt.sign(
        { id: user._id, role: user.role, mfaVerified: false, purpose: "pre2fa" },
        JWT_REFRESH_SECRET,
        { expiresIn: "30m" }
      );
      res.cookie("refreshCookie", preRefresh, cookieOpts(req, 30 * 60 * 1000));

      const otpTicket = jwt.sign(
        { sub: String(user._id), purpose: "otp" },
        JWT_OTP_SECRET || JWT_SECRET,
        { expiresIn: 300 } // 5m
      );
      res.cookie("otpTicket", otpTicket, cookieOpts(req, 5 * 60 * 1000));

      return res.json({ ok: true, need2fa: true });
    }

    // Normal session (no 2FA)
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role, mfaVerified: true },
      JWT_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user._id, role: user.role, mfaVerified: true },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("authCookie", accessToken, cookieOpts(req, 15 * 60 * 1000));
    res.cookie("refreshCookie", refreshToken, cookieOpts(req, 7 * 24 * 60 * 60 * 1000));
    return res.json({ ok: true });
  } catch (err) {
    console.error("local/login error:", err);
    return res.status(500).json({ ok: false, message: "server_error" });
  }
});

module.exports = router;
