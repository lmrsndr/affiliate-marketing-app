const User = require("../models/User");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.eu",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_ZOHO,
    pass: process.env.PASS_ZOHO,
  },
});

exports.sendEmail2FACode = async (req, res) => {
  try {
    if (!req.user?._id || !["user", "admin", "partner"].includes(req.user.role)) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.email) {
      return res.status(400).json({ message: "User does not have a valid email address" });
    }

    const now = Date.now();
    const cooldownMs = 60000;
    const expiresInMs = 5 * 60 * 1000;

    if (user.email2FA?.lastSentAt) {
      const timeSinceLastSend = now - new Date(user.email2FA.lastSentAt).getTime();
      if (timeSinceLastSend < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
        return res.status(429).json({
          message: `Please wait ${waitSeconds} seconds before requesting another code.`,
        });
      }
    }

    let rawCode;
    const existingCodeValid =
      user.email2FA &&
      user.email2FA.code &&
      new Date(user.email2FA.expiresAt).getTime() > now;

    if (existingCodeValid) {
      console.log("♻️ Reusing existing unexpired 2FA code — no regeneration");
      rawCode = null;
    } else {
      rawCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = crypto.createHash("sha256").update(rawCode).digest("hex");

      console.log(`📬 [2FA Code] ${rawCode} generated for ${user.email}`);

      user.email2FA = {
        code: hashedCode,
        expiresAt: new Date(now + expiresInMs),
        verified: false,
        failedAttempts: 0,
        lastFailedAt: null,
      };
    }

    user.email2FA.lastSentAt = new Date(now);
    user.interactions.push({
      action: "2fa_code_sent",
      details: { ip: req.ip, email: user.email },
      timestamp: new Date(),
    });

    await user.save();

    if (rawCode) {
      await transporter.sendMail({
        from: `"BundleBee Security" <${process.env.EMAIL_ZOHO}>`,
        to: user.email,
        subject: "🔐 Your BundleBee 2FA Code",
        html: `
          <p>Hello${user.name ? ` ${user.name}` : ""},</p>
          <p>Your two-factor authentication code is:</p>
          <h2 style="color:#007bff;">${rawCode}</h2>
          <p>This code will expire in 5 minutes.</p>
          <p>If you did not request this, please secure your account immediately.</p>
          <hr>
          <small>This message was sent automatically from BundleBee. Please do not reply.</small>
        `,
      });
    }

    return res.status(200).json({ message: "2FA code sent" });
  } catch (err) {
    console.error("❌ Failed to send 2FA code:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.verifyEmail2FACode = async (req, res) => {
  const { code, trustThisDevice } = req.body;

  try {
    if (!req.user?._id || !["user", "admin", "partner"].includes(req.user.role)) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await User.findById(req.user._id);
    if (!user || !user.email2FA) {
      return res.status(400).json({ message: "No 2FA code found. Please request a new one." });
    }

    const now = new Date();

    if (user.email2FA.failedAttempts >= 5) {
      const cooldownMs = 15 * 60 * 1000;
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
      return res.status(410).json({ message: "2FA code expired. Please request a new one." });
    }

    const submittedHash = crypto.createHash("sha256").update(code).digest("hex");
    const storedHash = user.email2FA.code;
    const match = storedHash === submittedHash;

    console.log("🔐 Code Match:", match);

    if (!match) {
      user.email2FA.failedAttempts = (user.email2FA.failedAttempts || 0) + 1;
      user.email2FA.lastFailedAt = now;
      await user.save();
      return res.status(401).json({ message: "Invalid code (match failed)" });
    }

    req.session.awaiting2FA = false;
    console.log("✅ Session updated: awaiting2FA = false");

    user.email2FA.verified = true;
    user.email2FA.failedAttempts = 0;
    user.email2FA.lastFailedAt = null;

    user.interactions.push({
      action: "2fa_verified",
      details: { method: "email", ip: req.ip },
      timestamp: now,
    });

    await user.save();

    const accessToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        twoFAVerified: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("authCookie", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: ".bundlebee.co.uk",
      path: "/",
      maxAge: 15 * 60 * 1000,
    });

    if (trustThisDevice) {
      const trustToken = jwt.sign(
        { id: user._id, purpose: "trustedDevice" },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.cookie("trustedDevice", trustToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: ".bundlebee.co.uk",
        path: "/",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    console.log("✅ Verification successful. Access token and (if selected) trusted device cookie set.");

    return res.status(200).json({ message: "2FA verified" });
  } catch (err) {
    console.error("❌ 2FA verification failed:", err);
    return res.status(500).json({ message: "2FA verification failed" });
  }
};

exports.resendEmail2FACode = async (req, res) => {
  return exports.sendEmail2FACode(req, res);
};
