const express = require("express");
const jwt = require("jsonwebtoken");
const attachUserIfPresent = require("../middleware/attachUserIfPresent");

const router = express.Router();

const { JWT_SECRET, JWT_REFRESH_SECRET } = process.env;

/* ──────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────── */
function getCookieBaseDomain(req) {
  const envDom = process.env.COOKIE_DOMAIN;
  if (envDom && envDom.trim()) return envDom.trim();
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
  if (host.endsWith(".bundlebee.co.uk") || host === "bundlebee.co.uk") return ".bundlebee.co.uk";
  return undefined;
}

/* ──────────────────────────────────────────────────────────────
   Debug: confirm cookies arrive
────────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────
   Status: reports auth + user; optionally includes a short token
────────────────────────────────────────────────────────────── */
router.get("/status", attachUserIfPresent, (req, res) => {
  const user = res.locals.user || null;
  const mfaVerified = !!(req.auth && req.auth.mfaVerified);
  const isAuthenticated =
    !!user || !!(req.auth && req.auth.isAuthenticated); // expose for older guards

  // Optional short-lived access token for clients that still expect one
  let accessToken = null;
  if (isAuthenticated && mfaVerified && user?._id) {
    accessToken = jwt.sign(
      { id: user._id, role: user.role, mfaVerified: true },
      JWT_SECRET,
      { expiresIn: "10m" }
    );
  }

  res.json({
    ok: true,
    user,
    isAuthenticated,
    mfaVerified,
    accessToken, // may be null; cookies remain source of truth
    source: req.auth?.source || null,
    where: "routes",
  });
});

/* ──────────────────────────────────────────────────────────────
   Next step helper for the UI
────────────────────────────────────────────────────────────── */
router.get("/next", attachUserIfPresent, (req, res) => {
  const mfaVerified = !!(req.auth && req.auth.mfaVerified);
  if (!req.auth?.isAuthenticated) return res.json({ ok: true, next: "login", where: "routes" });
  if (!mfaVerified) return res.json({ ok: true, next: "verify-2fa", where: "routes" });
  return res.json({ ok: true, next: "dashboard", where: "routes" });
});

/* ──────────────────────────────────────────────────────────────
   Refresh: rotate access cookie (and return token for clients)
   Expects a valid refreshCookie with mfaVerified=true
────────────────────────────────────────────────────────────── */
router.post("/refresh", (req, res) => {
  try {
    const refresh = req.cookies?.refreshCookie;
    if (!refresh) return res.status(401).json({ ok: false, reason: "no_refresh", message: "no_refresh" });

    const payload = jwt.verify(refresh, JWT_REFRESH_SECRET);
    if (!payload?.mfaVerified) {
      return res.status(403).json({ ok: false, reason: "mfa_not_verified", message: "mfa_not_verified" });
    }

    const accessToken = jwt.sign(
      { id: payload.id, role: payload.role, mfaVerified: true },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    const opts = {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: getCookieBaseDomain(req),
      path: "/",
      maxAge: 15 * 60 * 1000,
    };

    res.cookie("authCookie", accessToken, opts);
    // Return token as well for any legacy header-token flows (optional for you)
    return res.json({ ok: true, accessToken });
  } catch (e) {
    console.error("refresh error:", e?.message || e);
    return res.status(401).json({ ok: false, reason: "invalid_refresh", message: "invalid_refresh" });
  }
});

/* ──────────────────────────────────────────────────────────────
   Logout via API path (clears cookies)
────────────────────────────────────────────────────────────── */
router.get("/logout", (req, res) => {
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    domain: getCookieBaseDomain(req),
    path: "/",
  };
  try {
    res.clearCookie("authCookie", cookieOpts);
    res.clearCookie("refreshCookie", cookieOpts);
  } catch (_) {}
  return res.json({ ok: true, message: "✅ Logged out" });
});

module.exports = router;
