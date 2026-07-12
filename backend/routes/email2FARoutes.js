const express = require("express");
const router = express.Router();

const otpOrRefresh = require("../middleware/otpOrRefreshMiddleware");
const email2FAController = require("../controllers/email2FAController");

let attachUserIfPresent = (_req, _res, next) => next();
try {
  attachUserIfPresent = require("../middleware/attachUserIfPresent");
} catch (_error) {
  // Optional compatibility middleware.
}

// Only the token/session MFA claim is authoritative for this request.
// The legacy user.twoFAVerified database flag may remain true from a previous
// login and must not block a newly-created pre-MFA session.
const pending2FAOnly = (req, res, next) => {
  if (req.auth?.mfaVerified === true || req.session?.twoFAVerified === true) {
    return res.status(409).json({ message: "2FA is already verified for this session." });
  }
  return next();
};

if (typeof email2FAController.createContext === "function") {
  router.post("/context", attachUserIfPresent, pending2FAOnly, email2FAController.createContext);
}

router.post("/send", otpOrRefresh, pending2FAOnly, email2FAController.sendEmail2FACode);
router.post(
  "/resend",
  otpOrRefresh,
  pending2FAOnly,
  email2FAController.resendEmail2FACode || email2FAController.sendEmail2FACode
);
router.post("/verify", otpOrRefresh, pending2FAOnly, email2FAController.verifyEmail2FACode);

module.exports = router;
