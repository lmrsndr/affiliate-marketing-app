const express = require('express');
const router = express.Router();

const otpOrRefresh = require('../middleware/otpOrRefreshMiddleware');
const email2FAController = require('../controllers/email2FAController');

let attachUserIfPresent = (_r,_s,n)=>n();
try { attachUserIfPresent = require('../middleware/attachUserIfPresent'); } catch{}

// Block if already verified
const pending2FAOnly = (req,res,next)=>{
  if (req.user?.twoFAVerified || req.auth?.mfaVerified || req.session?.twoFAVerified) {
    return res.status(409).json({ msg: "2FA already verified." });
  }
  next();
};

// Mint/refresh otpTicket (not behind otpOrRefresh)
if (typeof email2FAController.createContext === "function") {
  router.post('/context', attachUserIfPresent, pending2FAOnly, email2FAController.createContext);
}

// Pre-MFA flow
router.post('/send',   otpOrRefresh, pending2FAOnly, email2FAController.sendEmail2FACode);
router.post('/resend', otpOrRefresh, pending2FAOnly, (email2FAController.resendEmail2FACode || email2FAController.sendEmail2FACode));
router.post('/verify', otpOrRefresh, pending2FAOnly, email2FAController.verifyEmail2FACode);

module.exports = router;
