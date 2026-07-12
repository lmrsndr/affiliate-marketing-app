const express = require("express");
const jwt = require("jsonwebtoken");
const attachUserIfPresent = require("../middleware/attachUserIfPresent");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const authController = require("../controllers/authController");
const runtime = require("../config/runtime");
const { authCookieOptions } = require("../config/http");
const User = require("../models/User");
const { authenticateAccessToken } = require("../services/supabaseAuth");

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

function userHasEnabledMfa(user) {
  return Boolean(user?.twoFA?.enabled || user?.email2FA?.enabled);
}

router.get("/status", attachUserIfPresent, async (req, res) => {
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (bearer) {
    try {
      const session = await authenticateAccessToken(bearer);
      return res.json({
        ok: true,
        user: {
          id: session.user.id,
          _id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email,
          role: session.role,
        },
        isAuthenticated: true,
        mfaVerified: session.aal === "aal2",
        accessToken: null,
        source: "supabase",
      });
    } catch (error) {
      return res.status(401).json({
        ok: false,
        user: null,
        isAuthenticated: false,
        mfaVerified: false,
        accessToken: null,
        source: "supabase",
      });
    }
  }

  const user = req.user || res.locals.user || null;
  const isAuthenticated = Boolean(user || req.auth?.isAuthenticated);
  const mfaVerified = Boolean(req.auth?.mfaVerified && userHasEnabledMfa(user));

  let accessToken = null;
  if (isAuthenticated && mfaVerified && user?._id) {
    accessToken = jwt.sign(
      { id: user._id, role: user.role, mfaVerified: true },
      runtime.jwtSecret,
      { expiresIn: "10m" }
    );
  }

  return res.json({
    ok: true,
    user,
    isAuthenticated,
    mfaVerified,
    accessToken,
    source: req.auth?.source || null,
  });
});

router.get("/next", attachUserIfPresent, (req, res) => {
  const user = req.user || res.locals.user || null;
  if (!req.auth?.isAuthenticated || !user) {
    return res.json({ ok: true, next: "login" });
  }

  const mfaVerified = Boolean(req.auth?.mfaVerified && userHasEnabledMfa(user));
  if (!mfaVerified) return res.json({ ok: true, next: "verify-2fa" });
  return res.json({ ok: true, next: "dashboard" });
});

router.get("/enabled-views", attachUserIfPresent, (req, res) => {
  if (!req.auth?.isAuthenticated || !req.user) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  const mfaVerified = Boolean(req.auth?.mfaVerified && userHasEnabledMfa(req.user));
  if (!mfaVerified) {
    return res.status(403).json({ ok: false, message: "MFA required", reason: "MFA_REQUIRED" });
  }

  const enabledViews = [];
  if (req.user.role === "admin") enabledViews.push("shopping-admin");
  return res.json({ ok: true, enabledViews });
});

router.post("/refresh", async (req, res) => {
  try {
    const refresh = req.cookies?.refreshCookie;
    if (!refresh) {
      return res.status(401).json({ ok: false, reason: "no_refresh", message: "No refresh session" });
    }

    const payload = jwt.verify(refresh, runtime.jwtRefreshSecret);
    if (!payload?.mfaVerified) {
      return res.status(403).json({ ok: false, reason: "mfa_not_verified", message: "MFA is required" });
    }

    const user = await User.findById(payload.id).select("role twoFA email2FA");
    if (!user) {
      return res.status(401).json({ ok: false, reason: "user_not_found", message: "Session user no longer exists" });
    }
    if (!userHasEnabledMfa(user)) {
      return res.status(403).json({ ok: false, reason: "mfa_setup_required", message: "MFA must be configured" });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role, mfaVerified: true },
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
