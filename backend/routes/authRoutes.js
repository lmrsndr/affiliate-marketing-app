const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/authController");

// Non-blocking cookie attach so /status can see login state
let attachUserIfPresent = (_req,_res,next)=>next();
try { attachUserIfPresent = require("../middleware/attachUserIfPresent"); } catch {}

// Health
router.get("/", (_req, res) => res.send("✅ Auth route is operational"));

// Core auth only (no 2FA in this router)
router.post("/register", ctrl.registerUser);
router.post("/login",    ctrl.loginUser);
router.post("/logout",   ctrl.logoutUser);
router.get ("/status",   attachUserIfPresent, ctrl.authStatus);

// Optional: refresh
if (typeof ctrl.refreshToken === "function") {
  router.post("/refresh", ctrl.refreshToken);
}

// Optional: forgot/reset
if (typeof ctrl.forgotUsername === "function") {
  router.post("/forgot-username", ctrl.forgotUsername);
}
if (typeof ctrl.resetPassword === "function") {
  router.post("/reset-password", ctrl.resetPassword);
}

// Optional: what's next
try {
  const { getNext } = require("../controllers/authNextController");
  if (typeof getNext === "function") router.get("/next", attachUserIfPresent, getNext);
} catch {}

module.exports = router;
