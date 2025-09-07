const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail"); // if your util exports { sendEmail }, change to: const { sendEmail } = require("../utils/sendEmail");

const {
  NODE_ENV = "development",
  COOKIE_DOMAIN = ".bundlebee.co.uk",
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_OTP_SECRET, // optional; falls back to JWT_SECRET
} = process.env;

const IS_PROD = NODE_ENV === "production";

/* ---------- cookie helpers ---------- */
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

/* ---------- token helpers ---------- */
function signOtpTicket(userId) {
  return jwt.sign(
    { sub: String(userId), purpose: "otp" },
    JWT_OTP_SECRET || JWT_SECRET,
    { expiresIn: 300 } // 5 minutes
  );
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

/* ---------- internal helpers ---------- */
// Best-effort: derive user id from existing context or auth claims
function getUserIdFromContext(req) {
  // Prefer otpTicket (explicit 2FA context)
  try {
    const t = req.cookies?.otpTicket;
    if (t) {
      const c = jwt.verify(t, JWT_OTP_SECRET || JWT_SECRET);
      if (c?.purpose === "otp" && c?.sub) return String(c.sub);
    }
  } catch (_) {}
  // Fall back to pre-2FA auth/refresh cookies (middleware may have set req.user/req.auth)
  if (req.auth?.isAuthenticated && req.auth?.claims?.id && !req.auth?.mfaVerified) {
    return String(req.auth.claims.id);
  }
  if (req.user?._id) return String(req.user._id);
  return null;
}

/* =======================================================================
   PUBLIC HANDLERS
   ======================================================================= */

/**
 * POST /api/2fa-email/context
 * Mint/refresh a short-lived otpTicket cookie for an authenticated-but-not-verified user.
 * NOTE: Do NOT put this behind otpOrRefresh; use a light middleware that attaches req.user/req.auth.
 */
exports.createContext = async (req, res) => {
  const uid = getUserIdFromContext(req) || req.auth?.claims?.id || req.user?._id;
  if (!uid) return res.status(401).json({ message: "Unauthorized (no 2FA context available)" });

  // Always (re)issue a fresh short-lived otpTicket
  const otpTicket = signOtpTicket(uid);
  setCookie(res, "otpTicket", otpTicket, { maxAge: 5 * 60 * 1000 }); // 5 minutes
  return res.status(204).end();
};

/**
 * POST /api/2fa-email/send
 * Requires otpTicket OR a pre-2FA refresh cookie (enforced by otpOrRefresh).
 */
exports.sendEmail2FACode = async (req, res) => {
  try {
    const user = req.user; // provided by otpOrRefresh (a Mongoose doc)
    if (!user) return res.status(401).json({ message: "Unauthorized (2FA context required)" });

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
          <p>To continue signing in to <strong>BundleBee</strong>, enter this verification code:</p>
          <div style="font-size: 28px; font-weight: bold; color: #2e86de; background: #f1f1f1; padding: 15px; text-align: center; border-radius: 8px; letter-spacing: 2px; margin: 20px 0;">
            ${code}
          </div>
          <p>This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr />
          <p style="font-size: 13px; color: #666;">
            If you didn’t try to sign in, please ignore this message or contact
            <a href="mailto:support@bundlebee.co.uk">support@bundlebee.co.uk</a>.
          </p>
          <p style="font-size: 12px; color: #aaa;">Sent by BundleBee • bundlebee.co.uk</p>
        </div>
      `,
      text: `Hi ${user.firstName || "there"},\n\nYour BundleBee verification code is: ${code}\n\nIt expires in 10 minutes.\n\nIf you didn't try to sign in, please ignore this message or contact support@bundlebee.co.uk.\n\n- BundleBee`,
    });

    return res.status(200).json({ message: "2FA code sent to your email." });
  } catch (err) {
    console.error("❌ Failed to send 2FA email:", err);
    return res.status(500).json({ message: "Failed to send 2FA code." });
  }
};

/**
 * POST /api/2fa-email/verify
 * Body: { code?: string, token?: string, trustThisDevice?: boolean }
 */
exports.verifyEmail2FACode = async (req, res) => {
  const { code, token, trustThisDevice } = req.body || {};
  const provided = String(code || token || "");
  try {
    const user = req.user; // from otpOrRefresh
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (!user.email2FA) {
      return res.status(400).json({ message: "No 2FA code found. Please request a new one." });
    }

    const now = new Date();

    // simple anti-bruteforce (cooldown after 5 fails for 15 minutes)
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

    // Accept exactly 6 digits
    if (!/^\d{6}$/.test(provided)) {
      return res.status(400).json({ message: "Invalid code format" });
    }

    const submittedHash = crypto.createHash("sha256").update(provided).digest("hex");
    const storedHash = user.email2FA.code;
    const match = storedHash && storedHash === submittedHash;

    if (!match) {
      user.email2FA.failedAttempts = (user.email2FA.failedAttempts || 0) + 1;
      user.email2FA.lastFailedAt = now;
      await user.save();
      return res.status(401).json({ message: "Invalid code" });
    }

    // Mark verified in DB for email 2FA and (optionally) globally
    user.email2FA.verified = true;
    user.twoFAVerified = true; // <-- important for /auth/status consumers
    user.email2FA.failedAttempts = 0;
    user.email2FA.lastFailedAt = null;
    // remove the code to prevent reuse
    user.email2FA.code = undefined;
    user.email2FA.expiresAt = undefined;

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

/**
 * POST /api/2fa-email/resend
 */
exports.resendEmail2FACode = async (req, res) => {
  try {
    return exports.sendEmail2FACode(req, res);
  } catch (err) {
    console.error("❌ Failed to resend 2FA email:", err);
    return res.status(500).json({ message: "Failed to resend 2FA code." });
  }
};
