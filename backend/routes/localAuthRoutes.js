const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const {
  NODE_ENV = 'development',
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_OTP_SECRET,
  COOKIE_DOMAIN = '.bundlebee.co.uk',
} = process.env;

const IS_PROD = NODE_ENV === 'production';

// ---------- cookie helpers (mirror server.js) ----------
function getCookieBaseDomain(req) {
  const envDom = process.env.COOKIE_DOMAIN;
  if (envDom && envDom.trim()) return envDom.trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  if (host.endsWith('.bundlebee.co.uk') || host === 'bundlebee.co.uk') return '.bundlebee.co.uk';
  return undefined; // host-only cookie if unknown (dev)
}
function cookieOpts(req, maxAge) {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'None' : 'Lax',
    domain: IS_PROD ? getCookieBaseDomain(req) : undefined,
    path: '/',
    maxAge,
  };
}

// ---------- POST /api/auth/local/login ----------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // passwordHash must be selectable
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const cookieBase = cookieOpts(req);

    // 2FA decision: if enabled (email2FA or TOTP) -> set otpTicket + short refresh; else full cookies
    const twoFAEnabled = !!(user?.twoFA?.enabled || user?.email2FA?.enabled);

    if (twoFAEnabled) {
      // Clear any existing cookies
      res.clearCookie('authCookie', cookieBase);
      res.clearCookie('refreshCookie', cookieBase);

      // short-lived pre-2FA refresh cookie (purpose: pre2fa)
      const preRefresh = jwt.sign(
        { id: user._id, role: user.role, mfaVerified: false, purpose: 'pre2fa' },
        JWT_REFRESH_SECRET,
        { expiresIn: '30m' }
      );
      res.cookie('refreshCookie', preRefresh, { ...cookieBase, maxAge: 30 * 60 * 1000 });

      // otpTicket to validate /verify-2fa step
      const otpTicket = jwt.sign(
        { sub: String(user._id), purpose: 'otp' },
        JWT_OTP_SECRET || JWT_SECRET,
        { expiresIn: 300 } // 5m
      );
      res.cookie('otpTicket', otpTicket, { ...cookieBase, maxAge: 5 * 60 * 1000 });

      return res.json({ success: true, next: 'verify-2fa' });
    }

    // No 2FA: issue full cookies
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role, mfaVerified: true },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { id: user._id, role: user.role, mfaVerified: true },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('authCookie', accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshCookie', refreshToken, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.json({ success: true, next: 'dashboard', user: { id: user._id, email: user.email, role: user.role } });
  } catch (e) {
    console.error('local login error', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------- OPTIONAL: POST /api/auth/local/register ----------
// You can keep this disabled if you register admins manually.
// To enable, remove the early return below.
router.post('/register', async (req, res) => {
  // return res.status(403).json({ success: false, message: 'Registration disabled' });
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered.' });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      passwordHash,
      role: 'user',
      twoFAVerified: false,
    });

    return res.status(201).json({ success: true, user: { id: user._id, email: user.email } });
  } catch (e) {
    console.error('local register error', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ---------- GET /api/auth/local/logout ----------
router.get('/logout', (req, res) => {
  const base = cookieOpts(req);
  res.clearCookie('authCookie', base);
  res.clearCookie('refreshCookie', base);
  return res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
