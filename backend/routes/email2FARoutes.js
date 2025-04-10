const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authMiddleware');
const email2FAController = require('../controllers/email2FAController');

// ✅ Send 6-digit code to user's email (initial or after timeout)
router.post('/send', authenticate, email2FAController.sendEmail2FACode);

// ✅ Resend 6-digit code (separate route, same logic or rate-limited version)
router.post('/resend', authenticate, email2FAController.resendEmail2FACode);

// ✅ Verify 6-digit code from user
router.post('/verify', authenticate, email2FAController.verifyEmail2FACode);

module.exports = router;
