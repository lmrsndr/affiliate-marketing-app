const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const logger = require("../logger");

/* =========================
   Rate Limiter (keep)
========================= */
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: "Too many requests from this IP, please try again later."
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
  setCookie(res, "otpTicket", ticket, { sameSite: "Lax", maxAge: OTP_TICKET_TTL_MS });
}

function clearOtpTicket(res) {
  clearCookie(res, "otpTicket");
}

/* =========================
   Trusted device util (keep)
========================= */
function isTrustedDevice(req) {
  try {
    const token = req.cookies.trustedDevice;
    if (!token) return false;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded?.purpose === "trustedDevice" && decoded?.id;
  } catch {
    return false;
  }
}
exports.isTrustedDevice = isTrustedDevice;

exports.trustThisDevice = async (req, res) => {
  try {
    const token = jwt.sign({ id: req.user.id, purpose: "trustedDevice" }, JWT_SECRET, { expiresIn: "30d" });
    setCookie(res, "trustedDevice", token, { sameSite: "None", maxAge: 30*24*60*60*1000 });
    res.status(200).json({ message: "✅ Trusted device cookie set" });
  } catch (err) {
    logger.error("❌ Failed to set trusted device cookie:", err);
    res.status(500).json({ message: "Failed to set trusted device" });
  }
};

/* =========================
   Audit helper (keep)
========================= */
async function logLoginAttempt(email, ip, status, userId = null) {
  try {
    await User.updateOne(
      { email: email.toLowerCase().trim() },
      { $push: { interactions: { action: "login_attempt", details: { status, ip }, timestamp: new Date() } } }
    );
  } catch (err) {
    logger.error("❌ Failed to log login attempt:", err);
  }
}

/* =========================
   Registration
========================= */
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: cleanEmail, password: hashed });

    // Newly registered users: no 2FA yet; treat as verified = true for access
    const accessToken = signAccessToken(user, true);
    const refreshToken = signRefreshToken(user, true);
    setAuthCookies(res, accessToken, refreshToken);

    logger.info(`✅ User registered: ${user.email}`);
    res.status(201).json({ accessToken, user: { id: user._id, email: user.email, role: user.role, twoFAVerified: true } });
  } catch (err) {
    logger.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   Login (password step)
   - If user has 2FA enabled and device not trusted:
     -> DO NOT issue auth/refresh cookies
     -> Issue short-lived otpTicket cookie
========================= */
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) return res.status(400).json({ message: "All fields are required" });

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      logger.warn(`❌ Failed login for ${email.trim().toLowerCase()} from ${req.ip}`);
      await logLoginAttempt(email, req.ip, "fail");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const deviceTrusted = isTrustedDevice(req);
    const twoFAEnabled = !!(user.twoFA?.enabled || user.email2FA?.verified);

    if (twoFAEnabled && !deviceTrusted) {
      // No full tokens yet
      clearAuthCookies(res);
      const ticket = signOtpTicket(user._id.toString());
      setOtpTicketCookie(res, ticket);
      // Set server session hint (optional)
      req.session.awaiting2FA = true;

      logger.info(`🔐 2FA required for ${user.email} (ticket issued).`);
      await logLoginAttempt(user.email, req.ip, "requires_2fa", user._id);
      return res.status(200).json({
        requires2FA: true,
        next: "/setup-2fa",
        user: { id: user._id, email: user.email, role: user.role, twoFAVerified: false }
      });
    }

    // Either 2FA disabled OR trusted device → treat as verified
    const accessToken = signAccessToken(user, true);
    const refreshToken = signRefreshToken(user, true);
    setAuthCookies(res, accessToken, refreshToken);

    req.session.awaiting2FA = false;
    logger.info(`✅ Successful login for ${user.email} from ${req.ip}`);
    await logLoginAttempt(user.email, req.ip, "success", user._id);

    return res.status(200).json({
      requires2FA: false,
      accessToken,
      user: { id: user._id, email: user.email, role: user.role, twoFAVerified: true }
    });
  } catch (err) {
    logger.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   Verify OTP
   - Validates OTP against user secret
   - Rotates cookies to full tokens with mfaVerified:true
========================= */
exports.verifyOtp = async (req, res) => {
  try {
    const { token } = req.body || {};
    const { otpTicket } = req.cookies || {};
    if (!otpTicket) return res.status(401).json({ message: "OTP ticket missing" });

    let payload;
    try {
      payload = jwt.verify(otpTicket, JWT_OTP_SECRET);
      if (payload?.purpose !== "otp") throw new Error("bad purpose");
    } catch {
      return res.status(401).json({ message: "OTP ticket invalid/expired" });
    }

    const user = await User.findById(payload.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Validate OTP: support app (TOTP) or email code
    let isValid = false;
    if (user.twoFA?.enabled && user.twoFA?.secret) {
      const speakeasy = require("speakeasy");
      isValid = speakeasy.totp.verify({
        secret: user.twoFA.secret,
        encoding: "base32",
        token,
        window: 1
      });
    } else if (user.email2FA?.verified && user.email2FA?.lastCode) {
      // your email-code verification here
      isValid = token && user.email2FA.lastCode === token; // replace with a secure compare
    }

    if (!isValid) return res.status(401).json({ message: "Invalid OTP" });

    // OTP good -> rotate to full tokens
    const accessToken = signAccessToken(user, true);
    const refreshToken = signRefreshToken(user, true);
    setAuthCookies(res, accessToken, refreshToken);
    clearOtpTicket(res);

    req.session.awaiting2FA = false;

    return res.status(200).json({
      success: true,
      accessToken,
      user: { id: user._id, email: user.email, role: user.role, twoFAVerified: true }
    });
  } catch (err) {
    logger.error("Verify OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   Logout
========================= */
exports.logoutUser = async (_req, res) => {
  try {
    clearAuthCookies(res);
    clearOtpTicket(res);
    res.status(200).json({ message: "Logged out successfully" });
  } catch {
    res.status(500).json({ message: "Logout failed" });
  }
};

/* =========================
   Refresh token
   - BLOCK refresh if 2FA not completed
========================= */
exports.refreshToken = async (req, res) => {
  const token = req.cookies.refreshCookie;
  if (!token) return res.status(401).json({ message: "No refresh token" });

  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ message: "Invalid token" });

    // If refresh token itself was minted pre-2FA (mfaVerified=false), block
    if (!decoded.mfaVerified) {
      return res.status(401).json({ message: "2FA required" });
    }

    const accessToken = signAccessToken(user, true);
    const refreshToken = signRefreshToken(user, true);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({ accessToken });
  } catch (err) {
    logger.error("Refresh error:", err);
    res.status(403).json({ message: "Invalid refresh token" });
  }
};

/* =========================
   Auth status
   - Source of truth = JWT claim mfaVerified
========================= */
exports.authStatus = async (req, res) => {
  try {
    const authCookie = req.cookies?.authCookie;
    if (!authCookie) return res.status(200).json({ isAuthenticated: false, user: null, accessToken: "" });

    let payload;
    try {
      payload = jwt.verify(authCookie, JWT_SECRET);
    } catch {
      return res.status(200).json({ isAuthenticated: false, user: null, accessToken: "" });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(200).json({ isAuthenticated: false, user: null, accessToken: "" });

    return res.status(200).json({
      isAuthenticated: true,
      accessToken: authCookie, // optional; FE can ignore
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        twoFAVerified: !!payload.mfaVerified,
        twoFA: {
          enabled: !!(user.twoFA?.enabled || user.email2FA?.verified),
          method: user.twoFA?.enabled ? "app" : (user.email2FA?.verified ? "email" : "none")
        },
        email2FA: { verified: !!(user.email2FA?.verified) }
      }
    });
  } catch (err) {
    logger.error("Auth status error:", err);
    res.status(500).json({ message: "Failed to get auth status" });
  }
};

/* =========================
   Profile (keep)
========================= */
exports.getUserProfile = async (req, res) => {
  try {
    // req.user is set by your JWT middleware; keep as-is
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    logger.error("Get profile error:", err);
    res.status(500).json({ message: "Error retrieving profile" });
  }
};

/* =========================
   Forgot/reset & username (keep)
========================= */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const genericResponse = { message: "If an account exists for that email, a reset link has been sent." };
  try {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) return res.status(200).json(genericResponse);

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(200).json(genericResponse);

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.resetToken = tokenHash;
    user.resetTokenExpires = Date.now() + 3600000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(cleanEmail)}`;
    await sendEmail({
      to: cleanEmail,
      subject: "Reset your BundleBee password",
      html: `<p>Click <a href='${resetUrl}'>here</a> to reset your password. This link expires in 1 hour.</p>`
    });

    logger.info(`🔒 Password reset token issued for ${cleanEmail}`);
    res.status(200).json(genericResponse);
  } catch (err) {
    logger.error("Forgot password error:", err);
    res.status(200).json(genericResponse);
  }
};

exports.resetPassword = async (req, res) => {
  const { token, email, newPassword } = req.body;
  try {
    if (!token || !email || !newPassword) return res.status(400).json({ message: "Missing required fields" });

    const user = await User.findOne({ email }).select("+resetToken +resetTokenExpires");
    if (!user) return res.status(404).json({ message: "User not found" });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (user.resetToken !== tokenHash || Date.now() > user.resetTokenExpires) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    logger.info(`🔐 Password reset confirmed for ${user.email}`);
    res.status(200).json({ message: "Password has been reset" });
  } catch (err) {
    logger.error("Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

exports.forgotUsername = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });

    await sendEmail({
      to: email,
      subject: "Your Username",
      html: `<p>Hello, your username is <strong>${user.name}</strong>.</p>`
    });

    logger.info(`📧 Username reminder sent to: ${user.email}`);
    res.status(200).json({ message: "Username sent to email" });
  } catch (err) {
    logger.error("Forgot username error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ensure deploy includes trustThisDevice
