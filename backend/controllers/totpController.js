const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const {
  NODE_ENV = "development",
  COOKIE_DOMAIN = ".bundlebee.co.uk",
  JWT_SECRET,
  JWT_REFRESH_SECRET,
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

exports.generateTOTPSecret = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+twoFA.secret");
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = speakeasy.generateSecret({ name: `BundleBee (${user.email})` });
    user.twoFA = user.twoFA || {};
    user.twoFA.secret = secret.base32;
    user.twoFA.enabled = false; // Require verification
    await user.save();

    const otpAuthUrl = secret.otpauth_url;
    const qrDataUrl = await qrcode.toDataURL(otpAuthUrl);

    res.json({ otpauth_url: otpAuthUrl, qr: qrDataUrl, secret: secret.base32 });
  } catch (e) {
    console.error("generateTOTPSecret error:", e);
    res.status(500).json({ message: "Error generating TOTP secret" });
  }
};

exports.getTOTPStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("twoFA.enabled email2FA.enabled email2FA.verified");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      enabled: !!user.twoFA?.enabled,
      appEnabled: !!user.twoFA?.enabled,
      emailEnabled: !!user.email2FA?.enabled,
      emailVerified: !!user.email2FA?.verified,
    });
  } catch (e) {
    console.error("getTOTPStatus error:", e);
    res.status(500).json({ message: "Failed to load 2FA status" });
  }
};

exports.verifyTOTP = async (req, res) => {
  const { token } = req.body || {};
  try {
    const user = await User.findById(req.user._id).select("+twoFA.secret");
    if (!user?.twoFA?.secret) return res.status(400).json({ message: "TOTP not initialized" });

    const ok = speakeasy.totp.verify({
      secret: user.twoFA.secret,
      encoding: "base32",
      token: String(token || ""),
      window: 1
    });

    if (!ok) return res.status(401).json({ message: "Invalid TOTP" });

    user.twoFA.enabled = true;
    user.twoFAVerified = true;
    await user.save();

    // rotate to full cookies
    const accessToken  = signAccessToken(user, true);
    const refreshToken = signRefreshToken(user, true);
    setCookie(res, "authCookie", accessToken,  { maxAge: ACCESS_TTL_MS });
    setCookie(res, "refreshCookie", refreshToken, { maxAge: REFRESH_TTL_MS });
    clearCookie(res, "otpTicket");

    res.json({ message: "TOTP verified", accessToken });
  } catch (e) {
    console.error("verifyTOTP error:", e);
    res.status(500).json({ message: "TOTP verification failed" });
  }
};

exports.disableTOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+twoFA.secret");
    if (!user?.twoFA?.enabled) return res.status(400).json({ message: "TOTP not enabled" });
    user.twoFA.enabled = false;
    user.twoFA.secret = undefined;
    await user.save();
    res.json({ message: "TOTP disabled" });
  } catch (e) {
    console.error("disableTOTP error:", e);
    res.status(500).json({ message: "Failed to disable TOTP" });
  }
};
