const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const logger = require("../logger");

/* =========================
   Mutation rate limiter

   Public catalogue reads and harmless authentication status checks are
   intentionally excluded. A normal Vue page load performs several GET and
   OPTIONS requests, and counting those against a 20-request allowance caused
   legitimate visitors to receive HTTP 429 responses.
========================= */
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
  handler: (_req, res) => {
    res.status(429).json({
      message: "Too many changes were submitted from this connection. Please wait a minute and try again.",
    });
  },
});
exports.globalRateLimiter = globalRateLimiter;

/* =========================
   Cookie + Token helpers
========================= */
const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_OTP_SECRET = JWT_SECRET, // you can set a separate secret if you want
  COOKIE_DOMAIN = ".bundlebee.co.uk",
  NODE_ENV = "production",
} = process.env;

// access/refresh TTLs
const ACCESS_TTL_MS  = 15 * 60 * 1000; // 15m
const REFRESH_TTL_MS = 7  * 24 * 60 * 60 * 1000; // 7d
const OTP_TICKET_TTL_MS = 5 * 60 * 1000; // 5m

function signAccessToken(user, mfaVerified) {
  // include claim mfaVerified that FE/back-end can trust
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, mfaVerified: !!mfaVerified },
    JWT_SECRET,
    { expiresIn: Math.floor(ACCESS_TTL_MS/1000) }
  );
}

function signRefreshToken(user, mfaVerified) {
  return jwt.sign(
    { id: user._id, role: user.role, mfaVerified: !!mfaVerified },
    JWT_REFRESH_SECRET,
    { expiresIn: Math.floor(REFRESH_TTL_MS/1000) }
  );
}

function signOtpTicket(userId) {
  return jwt.sign({ sub: userId, purpose: "otp" }, JWT_OTP_SECRET, { expiresIn: Math.floor(OTP_TICKET_TTL_MS/1000) });
}

function setCookie(res, name, value, opts={}) {
  const common = {
    httpOnly: true,
    secure: true,
    domain: COOKIE_DOMAIN,
    path: "/",
  };
  res.cookie(name, value, { ...common, ...opts });
}

function clearCookie(res, name) {
  res.clearCookie(name, { domain: COOKIE_DOMAIN, path: "/" });
}

function setAuthCookies(res, accessToken, refreshToken) {
  setCookie(res, "authCookie", accessToken, { sameSite: "Lax", maxAge: ACCESS_TTL_MS });
  setCookie(res, "refreshCookie", refreshToken, { sameSite: "Strict", maxAge: REFRESH_TTL_MS });
}

function clearAuthCookies(res) {
  clearCookie(res, "authCookie");
  clearCookie(res, "refreshCookie");
}

function setOtpTicketCookie(res, ticket) {
  setCookie(res, "otpTicket", ticket, { sameSite: "Strict", maxAge: OTP_TICKET_TTL_MS });
}

/* =========================
   Forgot password
========================= */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.json({ message: "If that account exists, a reset email has been sent." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000;
    await user.save();

    const frontendUrl = (process.env.FRONTEND_URL || "https://bundlebee.co.uk").replace(/\/+$/, "");
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your BundleBee password",
      html: `<p>Use the link below to reset your password. It expires in 30 minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });

    return res.json({ message: "If that account exists, a reset email has been sent." });
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`);
    return res.status(500).json({ message: "Unable to process password reset" });
  }
};

/* =========================
   Reset password
========================= */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and password are required" });
    if (String(password).length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) return res.status(400).json({ message: "Reset link is invalid or has expired" });

    user.password = await bcrypt.hash(password, 12);
    user.localEnabled = true;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    return res.status(500).json({ message: "Unable to reset password" });
  }
};

/* =========================
   Forgot username
========================= */
exports.forgotUsername = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user) {
      await sendEmail({
        to: user.email,
        subject: "Your BundleBee administrator account",
        html: `<p>Your BundleBee sign-in email is <strong>${user.email}</strong>.</p>`,
      });
    }

    return res.json({ message: "If that account exists, an email has been sent." });
  } catch (error) {
    logger.error(`Forgot username error: ${error.message}`);
    return res.status(500).json({ message: "Unable to process request" });
  }
};

/* =========================
   Trust this device
========================= */
exports.trustThisDevice = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const trustedToken = jwt.sign(
      { id: user._id, purpose: "trusted-device" },
      JWT_OTP_SECRET,
      { expiresIn: "30d" }
    );

    setCookie(res, "trustedDevice", trustedToken, {
      sameSite: "Lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({ ok: true });
  } catch (error) {
    logger.error(`Trust device error: ${error.message}`);
    return res.status(500).json({ message: "Unable to trust device" });
  }
};

module.exports.signAccessToken = signAccessToken;
module.exports.signRefreshToken = signRefreshToken;
module.exports.signOtpTicket = signOtpTicket;
module.exports.setAuthCookies = setAuthCookies;
module.exports.clearAuthCookies = clearAuthCookies;
module.exports.setOtpTicketCookie = setOtpTicketCookie;
