const express = require("express");
const jwt = require("jsonwebtoken");
const attachUserIfPresent = require("../middleware/attachUserIfPresent");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const authController = require("../controllers/authController");
const runtime = require("../config/runtime");
const { authCookieOptions } = require("../config/http");

const router = express.Router();

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/forgot-username", authController.forgotUsername);
router.post("/trust-device", requireVerified2FA, authController.trustThisDevice);

if (!runtime.isProduction) {
  router.get("/debug/cookies", (req, res) => {
    res.json({
      ok: true,
      saw: {
        hasAuth: Boolean(req.cookies?.authCookie),
        hasRefresh: Boolean(req.cookies?.refreshCookie),
      },
      host: req.headers.host,
      xForwardedHost: req.headers["x-forwarded-host"] || null,
    });
  });
}

router.get("/status", attachUserIfPresent, (req, res) => {
  const user = req.user || res.locals.user || null;
  const mfaVerified = Boolean(req.auth?.mfaVerified);
  const isAuthenticated = Boolean(user || req.auth?.isAuthenticated);

  let accessToken = null;
  if (isAuthenticated && mfaVerified && user?._id) {
    accessToken = jwt.sign(
      { id: user._id, role: user.role, mfaVerified: true },
      runtime.jwtSecret,
      { expiresIn: "10m" }
    );
  }

  res.json({
    ok: true,
    user,
    isAuthenticated,
    mfaVerified,
    accessToken,
    source: req.auth?.source || null,
  });
});

router.get("/next", attachUserIfPresent, (req, res) => {
  if (!req.auth?.isAuthenticated) return res.json({ ok: true, next: "login" });
  if (!req.auth?.mfaVerified) return res.json({ ok: true, next: "verify-2fa" });
  return res.json({ ok: true, next: "dashboard" });
});

router.get("/enabled-views", attachUserIfPresent, (req, res) => {
  if (!req.auth?.isAuthenticated || !req.auth?.mfaVerified || !req.user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const enabledViews = [];
  if (req.user.role === "admin") enabledViews.push("shopping-admin");
  return res.json({ ok: true, enabledViews });
});

router.post("/refresh", (req, res) => {
  try {
    const refresh = req.cookies?.refreshCookie;
    if (!refresh) {
      return res.status(401).json({ ok: false, reason: "no_refresh", message: "No refresh session" });
    }

    const payload = jwt.verify(refresh, runtime.jwtRefreshSecret);
    if (!payload?.mfaVerified) {
      return res.status(403).json({ ok: false, reason: "mfa_not_verified", message: "MFA is required" });
    }

    const accessToken = jwt.sign(
      { id: payload.id, role: payload.role, mfaVerified: true },
      runtime.jwtSecret,
      { expiresIn: "15m" }
    );

    res.cookie("authCookie", accessToken, authCookieOptions(req, { maxAge: 15 * 60 * 1000 }));
    return res.json({ ok: true, accessToken });
  } catch (error) {
    console.error("Token refresh failed:", error.message);
    return res.status(401).json({ ok: false, reason: "invalid_refresh", message: "Refresh session is invalid" });
  }
});

router.get("/logout", (req, res) => {
  const options = authCookieOptions(req);
  res.clearCookie("authCookie", options);
  res.clearCookie("refreshCookie", options);
  res.clearCookie("otpTicket", options);

  if (typeof req.logout === "function") {
    return req.logout((error) => {
      if (error) return res.status(500).json({ ok: false, message: "Logout failed" });
      return res.json({ ok: true, message: "Logged out" });
    });
  }

  return res.json({ ok: true, message: "Logged out" });
});

module.exports = router;
