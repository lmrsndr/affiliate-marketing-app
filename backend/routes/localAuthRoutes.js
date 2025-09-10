const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const {
  NODE_ENV = 'development',
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  COOKIE_DOMAIN = '.bundlebee.co.uk',
} = process.env;

const IS_PROD = NODE_ENV === 'production';
const router = express.Router();

// ---- cookie helpers (aligned with server.js) ----
function getCookieBaseDomain(req) {
  const envDom = process.env.COOKIE_DOMAIN;
  if (envDom && envDom.trim()) return envDom.trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  if (host.endsWith('.bundlebee.co.uk') || host === 'bundlebee.co.uk') return '.bundlebee.co.uk';
  return undefined;
}
function cookieOpts(req, maxAge) {
  const baseDomain = getCookieBaseDomain(req);
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'None',         // allow subdomain requests
    domain: IS_PROD ? baseDomain : undefined,
    path: '/',
    maxAge,
  };
}

router.post('/local/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Email and password required' });
    }

    // We need passwordHash field; make sure it is selected
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user || !user.localEnabled || !user.passwordHash) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    // MFA check – if the account *requires* 2FA we can short-circuit differently.
    const twoFAEnabled = !!(user.twoFA?.enabled || user.email2FA?.enabled);

    const accessPayload  = { id: user._id, email: user.email, role: user.role, mfaVerified: !twoFAEnabled };
    const refreshPayload = { id: user._id, role: user.role,  mfaVerified: !twoFAEnabled };

    const accessToken  = jwt.sign(accessPayload,  JWT_SECRET,          { expiresIn: '15m' });
    const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET,   { expiresIn: '7d' });

    // IMPORTANT: set both cookies with *identical* options (except maxAge)
    res.cookie('authCookie',    accessToken,  cookieOpts(req, 15 * 60 * 1000));
    res.cookie('refreshCookie', refreshToken, cookieOpts(req, 7 * 24 * 60 * 60 * 1000));

    // If 2FA is required, tell the client to go to /verify-2fa (cookies still issued but mfaVerified=false)
    if (twoFAEnabled) {
      return res.json({ ok: true, next: 'verify-2fa', user: { id: user._id, email: user.email, role: user.role } });
    }

    // Otherwise go straight to dashboard
    return res.json({ ok: true, next: 'dashboard', user: { id: user._id, email: user.email, role: user.role } });
  } catch (e) {
    console.error('local/login error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
