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

// --- cookie helpers (mirrors server.js) ---
function getCookieBaseDomain(req) {
  const envDom = process.env.COOKIE_DOMAIN;
  if (envDom && envDom.trim()) return envDom.trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  if (host.endsWith('.bundlebee.co.uk') || host === 'bundlebee.co.uk') return '.bundlebee.co.uk';
  return undefined;
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

// -------------------------
// POST /api/auth/register
// body: { name, email, password }
// -------------------------
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const emailLC = (email || '').trim().toLowerCase();

    if (!emailLC || !password || password.length < 8) {
      return res.status(400).json({ ok: false, message: 'Invalid payload' });
    }

    const existing = await User.findOne({ email: emailLC });
    if (existing) {
      return res.status(409).json({ ok: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name || '',
      email: emailLC,
      passwordHash,
      localEnabled: true,
      twoFAVerified: false,
    });

    // if you want auto-login after register, uncomment this block:
    /*
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role, mfaVerified: false },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { id: user._id, role: user.role, mfaVerified: false },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('authCookie', accessToken, cookieOpts(req, 15 * 60 * 1000));
    res.cookie('refreshCookie', refreshToken, cookieOpts(req, 7 * 24 * 60 * 60 * 1000));
    */

    return res.status(201).json({ ok: true, user: { id: user._id, email: user.email, role: user.role } });
  } catch (e) {
    console.error('register error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// ---------------------
// POST /api/auth/login
// body: { email, password }
// ---------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const emailLC = (email || '').trim().toLowerCase();

    if (!emailLC || !password) {
      return res.status(400).json({ ok: false, message: 'Invalid payload' });
    }

    // IMPORTANT: select +passwordHash because schema has select:false
    const user = await User.findOne({ email: emailLC })
      .select('+passwordHash')
      .lean(false); // need a mongoose doc for compare logic consistency

    if (!user || user.localEnabled === false || !user.passwordHash) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });
    }

    // If user requires 2FA -> set pre-2FA cookies (same approach as Google flow)
    const requires2FA = !!(user.twoFA?.enabled || user.email2FA?.enabled);
    if (requires2FA) {
      const preRefresh = jwt.sign(
        { id: user._id, role: user.role, mfaVerified: false, purpose: 'pre2fa' },
        JWT_REFRESH_SECRET,
        { expiresIn: '30m' }
      );
      res.cookie('refreshCookie', preRefresh, cookieOpts(req, 30 * 60 * 1000));

      const otpTicket = jwt.sign(
        { sub: String(user._id), purpose: 'otp' },
        JWT_OTP_SECRET || JWT_SECRET,
        { expiresIn: 300 } // 5 min
      );
      res.cookie('otpTicket', otpTicket, cookieOpts(req, 5 * 60 * 1000));

      return res.json({ ok: true, next: 'verify-2fa' });
    }

    // No 2FA -> full session cookies
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

    return res.json({ ok: true, next: 'dashboard' });
  } catch (e) {
    console.error('login error:', e);
    return res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
