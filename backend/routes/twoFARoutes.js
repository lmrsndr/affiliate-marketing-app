const express = require('express');
const router = express.Router();
const twoFAController = require('../controllers/twoFAController');
const authenticate = require('../middleware/authMiddleware');
const requireVerified2FA = require('../middleware/requireVerified2FA'); // ✅ NEW

// ✅ Generate new TOTP secret and QR code
router.get('/generate', authenticate, twoFAController.generate2FA);

// ✅ Verify entered code and enable TOTP 2FA
router.post('/verify', authenticate, twoFAController.verify2FA);

// ✅ Disable 2FA — only if user is already 2FA verified
router.post('/disable', authenticate, requireVerified2FA, twoFAController.disable2FA); // ✅ PROTECTED

module.exports = router;
