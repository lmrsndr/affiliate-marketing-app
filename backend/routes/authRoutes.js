const express = require("express");
const ctrl = require("../controllers/authController");
const email2FAController = require("../controllers/email2FAController");
const totpController = require("../controllers/totpController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Health for this router
router.get("/", (_req, res) => res.send("✅ Auth route is operational"));

// ──────────────────────────
// Core auth (controller-driven)
// ──────────────────────────
router.post("/register", ctrl.registerUser);
router.post("/login", ctrl.loginUser);
router.post("/logout", ctrl.logoutUser);

// 2FA flow
router.post("/verify-otp", ctrl.verifyOtp);
router.post("/trust-device", authMiddleware, ctrl.trustThisDevice);

// Tokens
router.post("/refresh", ctrl.refreshToken);   // use POST (not GET)
router.get("/status", ctrl.authStatus);

// Profile
router.get("/profile", authMiddleware, ctrl.getUserProfile);

// Recovery
router.post("/forgot-password", ctrl.forgotPassword);
router.post("/reset-password", ctrl.resetPassword);
router.post("/forgot-username", ctrl.forgotUsername);

// ──────────────────────────
/** 2FA helpers (email + app) — require an authenticated user
 *  Your authMiddleware should set req.user from a valid access token.
 */
router.post("/2fa-email/send", authMiddleware, email2FAController.sendEmail2FACode);
router.post("/2fa-email/verify", authMiddleware, email2FAController.verifyEmail2FACode);
router.post("/2fa-email/resend", authMiddleware, email2FAController.resendEmail2FACode);

router.get("/2fa-app/setup", authMiddleware, totpController.generateTOTPSecret);
router.post("/2fa-app/verify", authMiddleware, totpController.verifyTOTP);

module.exports = router;
