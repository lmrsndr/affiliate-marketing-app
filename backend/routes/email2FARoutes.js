const express = require('express');
const router = express.Router();

const otpOrRefresh = require('../middleware/otpOrRefreshMiddleware');
const email2FAController = require('../controllers/email2FAController');

// These endpoints are available in the "pending 2FA" state,
// authenticated by otpTicket or a pre-2FA refreshCookie.
router.post('/send',   otpOrRefresh, email2FAController.sendEmail2FACode);
router.post('/resend', otpOrRefresh, email2FAController.resendEmail2FACode);
router.post('/verify', otpOrRefresh, email2FAController.verifyEmail2FACode);

module.exports = router;
