const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const User = require("../models/User");

exports.generateTOTPSecret = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const secret = speakeasy.generateSecret({
      name: `BundleBee (${user.email})`,
    });

    user.twoFA = {
      enabled: false,
      secret: secret.base32,
    };
    await user.save();

    const qrDataURL = await qrcode.toDataURL(secret.otpauth_url);

    return res.status(200).json({
      message: "TOTP setup initiated",
      secret: secret.base32,
      qrCode: qrDataURL,
    });
  } catch (err) {
    console.error("❌ TOTP setup failed:", err);
    return res.status(500).json({ message: "TOTP setup error" });
  }
};

exports.verifyTOTP = async (req, res) => {
  const { token } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.twoFA?.secret) {
      return res.status(400).json({ message: "TOTP setup not found" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFA.secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(401).json({ message: "Invalid code" });
    }

    user.twoFA.enabled = true;
    await user.save();

    req.session.awaiting2FA = false;
    req.session.twoFAVerified = true;

    return res.status(200).json({ message: "TOTP verified", success: true });
  } catch (err) {
    console.error("❌ TOTP verify error:", err);
    return res.status(500).json({ message: "TOTP verification failed" });
  }
};
