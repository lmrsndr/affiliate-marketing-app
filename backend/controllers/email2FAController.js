const User = require("../models/User");
const nodemailer = require("nodemailer");

/**
 * 📧 Configured Zoho Mail Transporter
 */
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.eu",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_ZOHO,
    pass: process.env.PASS_ZOHO,
  },
});

/**
 * ✅ Send a 6-digit email 2FA code
 */
exports.sendEmail2FACode = async (req, res) => {
  try {
    if (!req.user?._id) {
      console.warn("⚠️ No authenticated user found on request.");
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.email) {
      console.warn("❌ Cannot send 2FA email: missing email for user", user._id);
      return res.status(400).json({ message: "User does not have a valid email address" });
    }

    const now = Date.now();
    const cooldownMs = 60000; // 60 seconds

    if (user.email2FA?.lastSentAt) {
      const timeSinceLastSend = now - new Date(user.email2FA.lastSentAt).getTime();
      if (timeSinceLastSend < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
        return res.status(429).json({
          message: `Please wait ${waitSeconds} seconds before requesting another code.`,
        });
      }
    }

    // ✅ Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`📬 [2FA Code] ${code} generated for ${user.email}`);

    // ✅ Save code and metadata
    user.email2FA = {
      code,
      expiresAt: new Date(now + 10 * 60 * 1000),
      verified: false,
      lastSentAt: new Date(now),
      failedAttempts: 0,
      lastFailedAt: null,
    };

    user.interactions.push({
      action: "2fa_code_sent",
      details: { ip: req.ip, email: user.email },
      timestamp: new Date(),
    });

    await user.save();

    // ✅ Attempt to send email
    try {
      console.log(`📨 Attempting to send 2FA code to ${user.email}`);
      await transporter.sendMail({
        from: `"BundleBee Security" <${process.env.EMAIL_ZOHO}>`,
        to: user.email,
        subject: "🔐 Your BundleBee 2FA Code",
        html: `
          <p>Hello${user.name ? ` ${user.name}` : ""},</p>
          <p>Your two-factor authentication code is:</p>
          <h2 style="color:#007bff;">${code}</h2>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this, please secure your account immediately.</p>
          <hr>
          <small>This message was sent automatically from BundleBee. Please do not reply.</small>
        `,
      });

      console.log("✅ 2FA email successfully sent.");
    } catch (emailErr) {
      console.error("❌ Error sending 2FA email via Zoho:", emailErr);
      return res.status(500).json({ message: "Email delivery failed. Please try again later." });
    }

    return res.status(200).json({ message: "2FA code sent" });
  } catch (err) {
    console.error("❌ Failed to send 2FA code:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * ✅ Verify email 2FA code
 */
exports.verifyEmail2FACode = async (req, res) => {
  const { code } = req.body;

  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.email2FA) {
      return res.status(400).json({ message: "No 2FA code found" });
    }

    const now = new Date();

    // ❌ Too many failed attempts
    if (user.email2FA.failedAttempts >= 5) {
      const cooldownMs = 15 * 60 * 1000; // 15 minutes
      const lastFailed = new Date(user.email2FA.lastFailedAt || 0);
      const diff = now - lastFailed;

      if (diff < cooldownMs) {
        return res.status(429).json({
          message: "Too many failed attempts. Please wait before trying again.",
        });
      } else {
        user.email2FA.failedAttempts = 0;
        user.email2FA.lastFailedAt = null;
      }
    }

    if (user.email2FA.expiresAt < now) {
      console.warn("⏰ 2FA code expired. Auto-resending...");
      await exports.sendEmail2FACode(req, res);
      return;
    }

    
    const crypto = require('crypto');
    const submittedHash = crypto.createHash("sha256").update(code).digest("hex");

    const storedCode = user.email2FA.code;
    const match = (storedCode === code || storedCode === submittedHash);

    if (!match) {
        console.warn(`❌ 2FA mismatch: Submitted=${code}, Stored=${storedCode}`);

      user.email2FA.failedAttempts = (user.email2FA.failedAttempts || 0) + 1;
      user.email2FA.lastFailedAt = now;

      await user.save();
      return res.status(401).json({ message: "Invalid code (match failed)" });
    }

    // ✅ Valid code
    user.email2FA.verified = true;
    user.email2FA.failedAttempts = 0;
    user.email2FA.lastFailedAt = null;

    user.interactions.push({
      action: "2fa_verified",
      details: { method: "email", ip: req.ip },
      timestamp: now,
    });

    await user.save();
    return res.status(200).json({ message: "2FA verified" });
  } catch (err) {
    console.error("❌ 2FA verification failed:", err);
    return res.status(500).json({ message: "2FA verification failed" });
  }
};

/**
 * 🔁 Resend 2FA Code (calls sendEmail2FACode)
 */
exports.resendEmail2FACode = async (req, res) => {
  return exports.sendEmail2FACode(req, res);
};
