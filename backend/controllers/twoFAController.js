const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const User = require("../models/User");

/**
 * ✅ Generate a new TOTP 2FA secret and QR code
 */
exports.generate2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = speakeasy.generateSecret({
      name: `BundleBee (${user.email})`,
    });

    user.twoFA.secret = secret.base32;
    user.twoFA.enabled = false; // Require verification
    await user.save();

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    console.log(`🔐 2FA secret generated for ${user.email}`);
    res.status(200).json({ qrCodeUrl, secret: secret.base32 }); // renamed `qr` to `qrCodeUrl` for clarity
  } catch (err) {
    console.error("❌ Error generating 2FA secret:", err);
    res.status(500).json({ message: "Error generating 2FA secret" });
  }
};

const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

/**
 * ✅ Verify TOTP code and enable 2FA with backup code generation
 */
exports.verify2FA = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token is required" });

  try {
    const user = await User.findById(req.user._id);
    if (!user?.twoFA?.secret) {
      return res.status(400).json({ message: "2FA setup incomplete" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFA.secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      console.warn(`❌ Invalid 2FA code for ${user.email}`);
      return res.status(401).json({ message: "Invalid 2FA code" });
    }

    // ✅ Generate 8 backup codes (plaintext)
    const backupCodesPlain = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(-8).toUpperCase().replace(/[^A-Z0-9]/g, "")
    );

    // 🔐 Hash and store them
    const backupCodesHashed = await Promise.all(
      backupCodesPlain.map(code => bcrypt.hash(code, 10))
    );

    user.twoFA.enabled = true;
    user.twoFA.backupCodes = backupCodesHashed;
    await user.save();

    console.log(`✅ 2FA enabled for ${user.email}`);
    res.status(200).json({
      success: true,
      message: "2FA enabled successfully",
      backupCodes: backupCodesPlain, // 👈 Returned only once
    });
  } catch (err) {
    console.error("❌ 2FA verification error:", err);
    res.status(500).json({ message: "Error verifying 2FA token" });
  }
};

/**
 * 🧯 Disable 2FA (TOTP)
 */
exports.disable2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.twoFA.enabled = false;
    user.twoFA.secret = null;
    user.twoFA.backupCodes = [];

    await user.save();

    console.log(`⚠️ 2FA disabled for ${user.email}`);
    res.status(200).json({ message: "2FA disabled" });
  } catch (err) {
    console.error("❌ Failed to disable 2FA:", err);
    res.status(500).json({ message: "Error disabling 2FA" });
  }
};
