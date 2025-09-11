const express = require("express");
const jwt = require("jsonwebtoken");
const attachUserIfPresent = require("../middleware/attachUserIfPresent");

const router = express.Router();

const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;

// Simple debug to confirm cookies arrive
router.get("/debug/cookies", (req, res) => {
  res.json({
    ok: true,
    saw: {
      hasAuth: !!(req.cookies && req.cookies.authCookie),
      hasRefresh: !!(req.cookies && req.cookies.refreshCookie),
    },
    host: req.headers["host"],
    xfh: req.headers["x-forwarded-host"] || null,
  });
});

// Status: reports auth state + (optional) user details from middleware
router.get("/status", attachUserIfPresent, (req, res) => {
  const user = res.locals.user || null;
  const mfaVerified = !!(req.auth && req.auth.mfaVerified);
  res.json({
    ok: true,
    user,
    mfaVerified,
    source: req.auth?.source || null,
    where: "routes",
  });
});

// Next step helper for the UI
router.get("/next", attachUserIfPresent, (req, res) => {
  const mfaVerified = !!(req.auth && req.auth.mfaVerified);
  if (!req.auth?.isAuthenticated) return res.json({ ok: true, next: "login", where: "routes" });
  if (!mfaVerified) return res.json({ ok: true, next: "verify-2fa", where: "routes" });
  return res.json({ ok: true, next: "dashboard", where: "routes" });
});

// Optional: access-token refresh (if you want silent rotation on page load)
// Expects a valid refreshCookie with mfaVerified=true
router.post("/refresh", (req, res) => {
  try {
    const refresh = req.cookies?.refreshCookie;
    if (!refresh) return res.status(401).json({ ok: false, message: "no_refresh" });

    const payload = jwt.verify(refresh, JWT_REFRESH_SECRET);
    if (!payload?.mfaVerified) {
      return res.status(403).json({ ok: false, message: "mfa_not_verified" });
    }

    const accessToken = jwt.sign(
      { id: payload.id, role: payload.role, mfaVerified: true },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // reuse your cookie domain rules
    function getCookieBaseDomain(req) {
      const envDom = process.env.COOKIE_DOMAIN;
      if (envDom && envDom.trim()) return envDom.trim();
      const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
      if (host.endsWith(".bundlebee.co.uk") || host === "bundlebee.co.uk") return ".bundlebee.co.uk";
      return undefined;
    }
    const opts = {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: getCookieBaseDomain(req),
      path: "/",
      maxAge: 15 * 60 * 1000,
    };

    res.cookie("authCookie", accessToken, opts);
    return res.json({ ok: true });
  } catch (e) {
    console.error("refresh error:", e?.message || e);
    return res.status(401).json({ ok: false, message: "invalid_refresh" });
  }
});

module.exports = router;
