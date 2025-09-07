const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const {
  NODE_ENV = "development",
  COOKIE_DOMAIN = ".bundlebee.co.uk",
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_OTP_SECRET = JWT_SECRET,
} = process.env;

const IS_PROD = NODE_ENV === "production";
const ACCESS_TTL_MS  = 15 * 60 * 1000;
const REFRESH_TTL_MS = 7  * 24 * 60 * 60 * 1000;

function cookieOpts(base = {}) {
  const o = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "None" : "Lax",
    path: "/",
  };
  if (IS_PROD) o.domain = COOKIE_DOMAIN;
  return { ...o, ...base };
}
const setCookie  = (res, name, val, opts) => res.cookie(name, val, cookieOpts(opts));
const clearCookie= (res, name)             => res.clearCookie(name, cookieOpts());

const signAccessToken = (user, mfaVerified) =>
  jwt.sign({ id:user._id, email:user.email, role:user.role, mfaVerified:!!mfaVerified }, JWT_SECRET, { expiresIn: Math.floor(ACCESS_TTL_MS/1000) });

const signRefreshToken = (user, mfaVerified) =>
  jwt.sign({ id:user._id, role:user.role, mfaVerified:!!mfaVerified }, JWT_REFRESH_SECRET, { expiresIn: Math.floor(REFRESH_TTL_MS/1000) });

const signOtpTicket = (uid) =>
  jwt.sign({ sub:String(uid), purpose:"otp" }, JWT_OTP_SECRET, { expiresIn: 300 });

/* create/refresh otpTicket */
exports.createContext = async (req, res) => {
  const uid = req.user?._id || req.auth?.claims?.id;
  if (!uid) return res.status(401).json({ message: "Unauthorized (no 2FA context available)" });

  const otpTicket = signOtpTicket(uid);
  setCookie(res, "otpTicket", otpTicket, { maxAge: 5 * 60 * 1000 });
  return res.status(204).end();
};

/* send code */
exports.sendEmail2FACode = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized (2FA context required)" });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const hash = crypto.createHash("sha256").update(code).digest("hex");

    user.email2FA = {
      code: hash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified: false,
      failedAttempts: 0,
      lastFailedAt: null,
    };
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "🔐 Your BundleBee verification code",
      html: `<p>Your verification code is:</p><div style="font-size:28px;font-weight:700">${code}</div><p>It expires in 10 minutes.</p>`,
      text: `Your verification code is ${code} (expires in 10 minutes)`,
    });

    return res.json({ message: "2FA code sent to your email." });
  } catch (e) {
    console.error("send 2FA email failed:", e);
    return res.status(500).json({ message: "Failed to send 2FA code." });
  }
};

/* verify code */
exports.verifyEmail2FACode = async (req, res) => {
  const { code, token, trustThisDevice } = req.body || {};
  const provided = String(code || token || "");
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (!/^\d{6}$/.test(provided)) return res.status(400).json({ message: "Invalid code format" });
    if (!user.email2FA) return res.status(400).json({ message: "No 2FA code found. Request a new one." });

    const now = Date.now();
    if (user.email2FA.failedAttempts >= 5) {
      const last = new Date(user.email2FA.lastFailedAt || 0).getTime();
      if (now - last < 15 * 60 * 1000) return res.status(429).json({ message: "Too many attempts. Please wait." });
      user.email2FA.failedAttempts = 0;
      user.email2FA.lastFailedAt = null;
    }

    if (new Date(user.email2FA.expiresAt).getTime() < now) {
      return res.status(410).json({ message: "2FA code expired. Request a new one." });
    }

    const subHash = crypto.createHash("sha256").update(provided).digest("hex");
    if (subHash !== user.email2FA.code) {
      user.email2FA.failedAttempts = (user.email2FA.failedAttempts || 0) + 1;
      user.email2FA.lastFailedAt = new Date();
      await user.save();
      return res.status(401).json({ message: "Invalid code" });
    }

    user.email2FA.verified = true;
    user.twoFAVerified = true;
    user.email2FA.code = undefined;
    user.email2FA.expiresAt = undefined;
    user.email2FA.failedAttempts = 0;
    user.email2FA.lastFailedAt = null;
    await user.save();

    // rotate to full cookies
    const accessToken  = signAccessToken(user, true);
    const refreshToken = signRefreshToken(user, true);
    setCookie(res, "authCookie", accessToken,  { maxAge: ACCESS_TTL_MS });
    setCookie(res, "refreshCookie", refreshToken, { maxAge: REFRESH_TTL_MS });
    clearCookie(res, "otpTicket");

    if (trustThisDevice) {
      const trust = jwt.sign({ id: user._id, purpose:"trustedDevice" }, JWT_SECRET, { expiresIn: "30d" });
      setCookie(res, "trustedDevice", trust, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    }

    return res.json({ message: "2FA verified", accessToken });
  } catch (e) {
    console.error("verify 2FA email failed:", e);
    return res.status(500).json({ message: "2FA verification failed" });
  }
};

/* resend */
exports.resendEmail2FACode = async (req, res) => exports.sendEmail2FACode(req, res);
