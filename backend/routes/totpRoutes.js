const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const totp = require("../controllers/totpController");

// Pre-MFA setup/verify (must be logged in, MFA not required)
router.get ("/setup",  requireAuth, totp.generateTOTPSecret);
router.post("/verify", requireAuth, totp.verifyTOTP);

// Post-MFA manage (disable)
if (typeof totp.disableTOTP === "function") {
  router.post("/disable", requireVerified2FA, totp.disableTOTP);
}

module.exports = router;
