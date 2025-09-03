const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const {
  NODE_ENV = "development",
  COOKIE_DOMAIN = ".bundlebee.co.uk",
  JWT_SECRET,
  JWT_REFRESH_SECRET,
} = process.env;

const IS_PROD = NODE_ENV === "production";

// Cookie helpers
function cookieOpts(base = {}) {
  const common = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "None" : "Lax",
    path: "/",
  };
  if (IS_PROD) common.domain = COOKIE_DOMAIN;
  return { ...common, ...base };
}
function setCookie(res, name, value, opts) {
  res.cookie(name, value, cookieOpts(opts));
}
function clearCookie(res, name) {
  res.clearCookie(name, cookieOpts());
}

// After 2FA verified, rotate to full tokens (mfaVerified: true)
function rotateToFullTokens(res, user) {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role, mfaVerified: true },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { id: user._id, role: user.role, mfaVerified: true },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  // Clear any otpTicket
  clearCookie(res, "otpTicket");
  // Set new real cookies
  setCookie(res, "authCookie", accessToken, { maxAge: 15 * 60 * 1000 });
  setCookie(res, "refreshCookie", refreshToken, { maxAge: 7 * 24 * 60 * 60 * 1000 });
  return { accessToken, refreshToken };
}

// ✅ Send Email 2FA Code
exports.sendEmail2FACode = async (req, res) => {
  try {
    // req.user is provided by otpOrRefresh middleware (a Mongoose doc)
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = crypto.createHash("sha256").update(code).digest("hex");

    user.email2FA = {
      code: hashed,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      verified: false,
      failedAttempts: 0,
      lastFailedAt: null,
    };
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "🔐 Your BundleBee 2FA Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; color: #222; padding: 20px; border: 1px solid #eee; max-width: 600px; margin: auto;">
          <h2 style="color: #2c3e50;">Hi ${user.firstName || "there"},</h2>
          <p>To continue signing into your <strong>BundleBee</strong> account, please enter the following verification code:</p>
          <div style="font-size: 28px; font-weight: bold; color: #2e86de; background: #f1f1f1; padding: 15px; text-align: center; border-radius: 8px; letter-spacing: 2px; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in <strong>10 minutes</strong>. For your security, do not share this code with anyone.</p>
          <hr />
          <p style="font-size: 13px; color: #666;">
            If you did not try to sign in, please ignore this message or contact us immediately at 
            <a href="mailto:support@bundlebee.co.uk">support@bundlebee.co.uk</a>.
          </p>
          <p style="font-size: 12px; color: #aaa;">Sent by BundleBee • bundlebee.co.uk</p>
        </div>
      `,
      text: `Hi ${user.firstName || "there"},\n\nYour BundleBee verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't try to sign in, please ignore this message or contact support@bundlebee.co.uk.\n\n- The BundleBee Team`,
    });

    return res.status(200).json({ message: "2FA code sent to your email." });
  } catch (err) {
    console.error("❌ Failed to send 2FA email:", err);
    return res.status(500).json({ message: "Failed to send 2FA code." });
  }
};

// ✅ Verify Email 2FA Code
exports.verifyEmail2FACode = async (req, res) => {
  const { code, trustThisDevice } = req.body || {};
  try {
    const user = req.user; // from otpOrRefresh
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (!user.email2FA) {
      return res.status(400).json({ message: "No 2FA code found. Please request a new one." });
    }

    const now = new Date();

    if (user.email2FA.failedAttempts >= 5) {
      const cooldownMs = 15 * 60 * 1000;
      const lastFailed = new Date(user.email2FA.lastFailedAt || 0);
      if (now - lastFailed < cooldownMs) {
        return res.status(429).json({ message: "Too many failed attempts. Please wait before trying again." });
      } else {
        user.email2FA.failedAttempts = 0;
        user.email2FA.lastFailedAt = null;
      }
    }

    if (user.email2FA.expiresAt < now) {
      return res.status(410).json({ message: "2FA code expired. Please request a new one." });
    }

    const submittedHash = crypto.createHash("sha256").update(code).digest("hex");
    const storedHash = user.email2FA.code;
    const match = storedHash && storedHash === submittedHash;

    if (!match) {
      user.email2FA.failedAttempts = (user.email2FA.failedAttempts || 0) + 1;
      user.email2FA.lastFailedAt = now;
      await user.save();
      return res.status(401).json({ message: "Invalid code" });
    }

    // Mark verified in DB for email 2FA
    user.email2FA.verified = true;
    user.email2FA.failedAttempts = 0;
    user.email2FA.lastFailedAt = null;
    user.interactions = user.interactions || [];
    user.interactions.push({
      action: "2fa_verified",
      details: { method: "email", ip: req.ip },
      timestamp: now,
    });
    await user.save();

    // Rotate to full cookies with mfaVerified:true
    const tokens = rotateToFullTokens(res, user);

    // Optional: trust device for 30d
    if (trustThisDevice) {
      const trustToken = jwt.sign(
        { id: user._id, purpose: "trustedDevice" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      setCookie(res, "trustedDevice", trustToken, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    }

    return res.status(200).json({ message: "2FA verified", accessToken: tokens.accessToken });
  } catch (err) {
    console.error("❌ 2FA verification failed:", err);
    return res.status(500).json({ message: "2FA verification failed" });
  }
};

// ✅ Resend Email 2FA Code
exports.resendEmail2FACode = async (req, res) => {
  try {
    // req.user already resolved by middleware
    return exports.sendEmail2FACode(req, res);
  } catch (err) {
    console.error("❌ Failed to resend 2FA email:", err);
    return res.status(500).json({ message: "Failed to resend 2FA code." });
  }
};
