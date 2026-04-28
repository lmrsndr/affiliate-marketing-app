const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const totp = require("../controllers/totpController");

// Pre-MFA setup/verify (logged-in, no MFA required)
router.get ("/status", requireAuth,      totp.getTOTPStatus);
router.get ("/setup",  requireAuth,      totp.generateTOTPSecret);
router.post("/verify", requireAuth,      totp.verifyTOTP);

// Post-MFA manage
if (typeof totp.disableTOTP === "function") {
  router.post("/disable", requireVerified2FA, totp.disableTOTP);
}

module.exports = router;
