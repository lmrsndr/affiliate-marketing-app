const express = require('express');
const router = express.Router();

const otpOrRefresh = require('../middleware/otpOrRefreshMiddleware');
const email2FAController = require('../controllers/email2FAController');

// Optional middleware: attach user/claims from cookies if available.
// If it's not present in your codebase, we gracefully no-op.
let attachUserIfPresent = (_req, _res, next) => next();
try {
  // Should decode authCookie/refreshCookie and set req.user/req.auth (best-effort).
  attachUserIfPresent = require('../middleware/attachUserIfPresent');
} catch (_) { /* no-op if not found */ }

/* -------------------------
   Small hardening: block if 2FA already verified
-------------------------- */
const pending2FAOnly = (req, res, next) => {
  // allow either flag, depending on your schema / JWT claims
  const alreadyVerified =
    Boolean(req.user?.twoFAVerified) ||
    Boolean(req.auth?.mfaVerified)   ||
    Boolean(req.session?.twoFAVerified);

  if (alreadyVerified) {
    return res.status(409).json({ msg: "2FA already verified." });
  }
  return next();
};

/* -------------------------
   Resolve controller handlers (backward compatible)
-------------------------- */
function pick(...fns) {
  for (const fn of fns) if (typeof fn === 'function') return fn;
  return null;
}

// Prefer new generic names; fall back to older ones if needed.
const createContextHandler = pick(
  email2FAController.createContext,
  email2FAController.createOtpContext,
  email2FAController.mintContext
);

const sendHandler = pick(
  email2FAController.sendCode,
  email2FAController.sendEmail2FACode
);

const resendHandler = pick(
  email2FAController.resendCode,
  email2FAController.resendEmail2FACode,
  // fall back to send if no dedicated resend
  email2FAController.sendCode,
  email2FAController.sendEmail2FACode
);

const verifyHandler = pick(
  email2FAController.verifyCode,
  email2FAController.verifyEmail2FACode
);

// Fail loudly if a handler is missing
const requireHandler = (handlerName, fn) => (req, res, next) => {
  if (typeof fn !== 'function') {
    return res.status(501).json({ msg: `Not Implemented: ${handlerName} handler missing in email2FAController` });
  }
  return fn(req, res, next);
};

/* -------------------------
   Routes
-------------------------- */

// Mint/refresh an OTP context cookie (e.g., otpTicket) for an authenticated-but-not-verified user.
// Do NOT gate this behind otpOrRefresh, because we may be creating the very context that otpOrRefresh expects.
router.post(
  '/context',
  attachUserIfPresent,
  pending2FAOnly,
  requireHandler('createContext', createContextHandler)
);

// These endpoints are available in the "pending 2FA" state,
// authenticated by otpTicket OR a pre-2FA refreshCookie (as enforced by otpOrRefresh).
router.post('/send',
  otpOrRefresh,
  pending2FAOnly,
  requireHandler('sendCode', sendHandler)
);

router.post('/resend',
  otpOrRefresh,
  pending2FAOnly,
  requireHandler('resendCode', resendHandler)
);

router.post('/verify',
  otpOrRefresh,
  pending2FAOnly,
  requireHandler('verifyCode', verifyHandler)
);

module.exports = router;
