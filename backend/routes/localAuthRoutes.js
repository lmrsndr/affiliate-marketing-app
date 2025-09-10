const express = require('express');
const bcrypt = require('bcryptjs'); // pure JS (safe on Node 22)
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

// --- cookie helpers (mirror server.js) ---
function getCookieBaseDomain(req) {
  const envDom = process.env.COOKIE_DOMAIN;
  if (envDom && envDom.trim()) return envDom.trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  if (host.endsWith('.bundlebee.co.uk') || host === 'bundlebee.co.uk') return '.bundlebee.co.uk';
  return undefined; // host-only cookie if unknown
}
function cookieOpts(req, maxAge) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    domain: getCookieBaseDomain(req),
    path: '/',
    maxAge,
  };
}

// ------------------ REGISTER ------------------
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const prev = await User.findOne({ email });
    if (prev) return res.status(409).json({ success: false, message: 'Email already in use.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      name: name || email.split('@')[0],
      role: 'user',
      localEnabled: true,
      passwordHash,
      twoFAVerified: false,
    });

    // New users usually have no 2FA -> issue full cookies
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

    res.cookie('authCookie', accessToken, cookieOpts(req, 15 * 60 * 1000));
    res.cookie('refreshCookie', refreshToken, cookieOpts(req, 7 * 24 * 60 * 60 * 1000));

    return res.json({ success: true, user: { id: user._id, email: user.email, role: user.role } });
  } catch (e) {
    console.error('local/register error', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------ LOGIN ------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // select passwordHash (schema may have select:false)
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // If this account requires 2FA, mirror your Google callback pre-2FA flow
    const twoFAEnabled = !!(user?.twoFA?.enabled || user?.email2FA?.enabled);
    if (twoFAEnabled) {
      const base = cookieOpts(req, undefined);
      res.clearCookie('authCookie', base);
      res.clearCookie('refreshCookie', base);

      try {
        await User.updateOne({ _id: user._id }, { $set: { 'email2FA.verified': false } });
      } catch (_) {}

      // short-lived pre-2FA refresh cookie
      const preRefresh = jwt.sign(
        { id: user._id, role: user.role, mfaVerified: false, purpose: 'pre2fa' },
        JWT_REFRESH_SECRET,
        { expiresIn: '30m' }
      );
      res.cookie('refreshCookie', preRefresh, cookieOpts(req, 30 * 60 * 1000));

      // otpTicket for 2FA endpoints
      const otpTicket = jwt.sign(
        { sub: String(user._id), purpose: 'otp' },
        JWT_OTP_SECRET || JWT_SECRET,
        { expiresIn: 300 } // 5m
      );
      res.cookie('otpTicket', otpTicket, cookieOpts(req, 5 * 60 * 1000));

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

    res.cookie('authCookie', accessToken, cookieOpts(req, 15 * 60 * 1000));
    res.cookie('refreshCookie', refreshToken, cookieOpts(req, 7 * 24 * 60 * 60 * 1000));

    return res.json({ success: true, next: 'dashboard' });
  } catch (e) {
    console.error('local/login error', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ------------------ LOGOUT ------------------
router.post('/logout', (req, res) => {
  const base = cookieOpts(req, undefined);
  res.clearCookie('refreshCookie', base);
  res.clearCookie('authCookie', base);
  return res.json({ success: true });
});

module.exports = router;
