const express = require('express');
const router = express.Router();

/**
 * GET /api/auth/status
 * Returns current auth snapshot for the caller.
 */
router.get('/status', (req, res) => {
  const user = res.locals.user || null;
  const mfaVerified = !!(req.auth && req.auth.mfaVerified);
  res.json({
    ok: true,
    user,
    mfaVerified,
    source: req.auth?.source || null,
  });
});

/**
 * GET /api/auth/next
 * Lightweight decision endpoint for client flows.
 * Adjust to your onboarding/2FA logic.
 */
router.get('/next', (req, res) => {
  const mfaVerified = !!(req.auth && req.auth.mfaVerified);
  if (!req.auth?.isAuthenticated) {
    return res.json({ ok: true, next: 'login' });
  }
  if (!mfaVerified) {
    return res.json({ ok: true, next: 'verify-2fa' });
  }
  return res.json({ ok: true, next: 'dashboard' });
});

module.exports = router;
