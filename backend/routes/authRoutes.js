const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/authController");

// Non-blocking helper that attaches req.auth/req.user from cookies if present.
// If it doesn't exist in your codebase, we'll gracefully no-op.
let attachUserIfPresent = (_req, _res, next) => next();
try {
  attachUserIfPresent = require("../middleware/attachUserIfPresent");
} catch (_) { /* no-op */ }

/* Util: pick first existing handler (backwards compatible names) */
const pick = (...fns) => fns.find((fn) => typeof fn === "function") || null;
const handler = (name, fn) => (req, res, next) => {
  if (typeof fn !== "function") {
    return res.status(501).json({ msg: `Not Implemented: ${name}` });
  }
  return fn(req, res, next);
};

/* Resolve handlers from controller with safe fallbacks */
const registerH      = pick(ctrl.register, ctrl.registerUser);
const loginH         = pick(ctrl.login, ctrl.loginUser, ctrl.authLogin);
const logoutH        = pick(ctrl.logout, ctrl.logoutUser);
const statusH        = pick(ctrl.status, ctrl.getStatus, ctrl.authStatus);
const refreshH       = pick(ctrl.refresh, ctrl.refreshToken);
const enabledViewsH  = pick(ctrl.enabledViews, ctrl.getEnabledViews);
const forgotUserH    = pick(ctrl.forgotUsername, ctrl.forgotUser);
const resetPasswordH = pick(ctrl.resetPassword, ctrl.doResetPassword);

/* Routes */

// Public auth endpoints
router.post("/register", handler("register", registerH));
router.post("/login",    handler("login",    loginH));

// Logout (doesn't need a guard; controller will clear cookies/session)
router.get("/logout", handler("logout", logoutH));

// Status should be able to read cookies if present
router.get("/status", attachUserIfPresent, handler("status", statusH));

// Your build has no /auth/refresh route server-side (404 seen in logs),
// but if the controller exposes one, this will just work.
router.get("/refresh", handler("refresh", refreshH));

// Feature gating / view enabling – allow reading cookies if present
router.get("/enabled-views", attachUserIfPresent, handler("enabledViews", enabledViewsH));

// Recovery helpers
router.post("/forgot-username", handler("forgotUsername", forgotUserH));
router.post("/reset-password",  handler("resetPassword",  resetPasswordH));

module.exports = router;
