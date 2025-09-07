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

/* ----------------- cookie helpers + token rotation ----------------- */
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
  clearCookie(res, "otpTicket");
  setCookie(res, "authCookie", accessToken, { maxAge: 15 * 60 * 1000 });
  setCookie(res, "refreshCookie", refreshToken, { maxAge: 7 * 24 * 60 * 60 * 1000 });
  return { accessToken, refreshToken };
}

/* ----------------- helpers ----------------- */
const now = () => new Date();
const ms = (n) => n;
const seconds = (n) => n * 1000;
const minutes = (n) => n * 60 * 1000;

/** Create + persist a new code and send the email */
async function mintAndEmailCode(user) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hashed = crypto.createHash("sha256").update(code).digest("hex");

  user.email2FA = {
    code: hashed,
    expiresAt: new Date(Date.now() + minutes(10)),
    verified: false,
    failedAttempts: 0,
    lastFailedAt: null,
    lastSentAt: now(),
  };
  await user.save();

  await sendEmail({
    to: user.email,
    subject: "🔐 Your BundleBee 2FA Verification Code",
    html: `
      <div style="font-family:Arial,sans-serif;color:#222;padding:20px;border:1px solid #eee;max-width:600px;margin:auto">
        <h2 style="color:#2c3e50;">Hi ${user.firstName || "there"},</h2>
        <p>Use this verification code to continue signing in:</p>
        <div style="font-size:28px;font-weight:bold;color:#2e86de;background:#f7f7f7;padding:15px;text-align:center;border-radius:8px;letter-spacing:2px;margin:20px 0;">${code}</div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <hr />
        <p style="font-size:13px;color:#666;">If you didn't try to sign in, ignore this message or contact <a href="mailto:support@bundlebee.co.uk">support@bundlebee.co.uk</a>.</p>
      </div>
    `,
    text: `Your BundleBee verification code is: ${code} (valid for 10 minutes)`,
  });
}

/* ----------------- controllers ----------------- */

/**
 * POST /api/2fa-email/send
 * If a valid code already exists and was sent recently, return 200 {alreadySent:true}
 * so the UI does not treat it as an error.
 */
exports.sendEmail2FACode = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const e2 = user.email2FA || {};
    const valid = e2.expiresAt && new Date(e2.expiresAt) > now();
    const sentRecently = e2.lastSentAt && now() - new Date(e2.lastSentAt) < minutes(1);

    // A valid code already exists; don't spam, but also don't error
    if (valid && sentRecently) {
      return res.status(200).json({ message: "Code already sent. Please check your email.", alreadySent: true });
    }

    await mintAndEmailCode(user);
    return res.status(200).json({ message: "2FA code sent to your email." });
  } catch (err) {
    console.error("❌ Failed to send 2FA email:", err);
    return res.status(500).json({ message: "Failed to send 2FA code." });
  }
};

/**
 * POST /api/2fa-email/resend
 * Always mint a new code (with a short throttle).
 */
exports.resendEmail2FACode = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const e2 = user.email2FA || {};
    if (e2.lastSentAt && now() - new Date(e2.lastSentAt) < seconds(30)) {
      return res.status(429).json({ message: "Please wait a few seconds before requesting a new code." });
    }

    await mintAndEmailCode(user);
    return res.status(200).json({ message: "A new 2FA code has been sent." });
  } catch (err) {
    console.error("❌ Failed to resend 2FA email:", err);
    return res.status(500).json({ message: "Failed to resend 2FA code." });
  }
};

/**
 * POST /api/2fa-email/verify
 */
exports.verifyEmail2FACode = async (req, res) => {
  try {
    const { code, trustThisDevice } = req.body || {};
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (!user.email2FA) {
      return res.status(400).json({ message: "No 2FA code found. Please request a new one." });
    }

    const nowDt = now();

    // Basic lockout for repeated failures
    if (user.email2FA.failedAttempts >= 5) {
      const lastFailed = new Date(user.email2FA.lastFailedAt || 0);
      if (nowDt - lastFailed < minutes(15)) {
        return res.status(429).json({ message: "Too many failed attempts. Please wait before trying again." });
      } else {
        user.email2FA.failedAttempts = 0;
        user.email2FA.lastFailedAt = null;
      }
    }

    if (new Date(user.email2FA.expiresAt) < nowDt) {
      return res.status(410).json({ message: "2FA code expired. Please request a new one." });
    }

    const submittedHash = crypto.createHash("sha256").update(String(code || "")).digest("hex");
    const match = user.email2FA.code && user.email2FA.code === submittedHash;

    if (!match) {
      user.email2FA.failedAttempts = (user.email2FA.failedAttempts || 0) + 1;
      user.email2FA.lastFailedAt = nowDt;
      await user.save();
      return res.status(401).json({ message: "Invalid code" });
    }

    // Mark verified + rotate tokens
    user.email2FA.verified = true;
    user.email2FA.failedAttempts = 0;
    user.email2FA.lastFailedAt = null;
    await user.save();

    const tokens = rotateToFullTokens(res, user);

    // Optional "trusted device" cookie
    if (trustThisDevice) {
      const trustToken = jwt.sign({ id: user._id, purpose: "trustedDevice" }, JWT_SECRET, { expiresIn: "30d" });
      setCookie(res, "trustedDevice", trustToken, { maxAge: 30 * 24 * 60 * 60 * 1000 });
    }

    return res.status(200).json({ message: "2FA verified", accessToken: tokens.accessToken });
  } catch (err) {
    console.error("❌ 2FA verification failed:", err);
    return res.status(500).json({ message: "2FA verification failed" });
  }
};
