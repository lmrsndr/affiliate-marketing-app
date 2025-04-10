// controllers/authController.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const logger = require("../logger");
const rateLimit = require("express-rate-limit");

// ⛔ Global Rate Limiter Middleware (apply in server.js)
const globalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: "Too many requests from this IP, please try again later."
});
exports.globalRateLimiter = globalRateLimiter;

function generateTokens(user) {
  const twoFAVerified = user.email2FA?.verified || user.twoFA?.enabled || false;
  const accessToken = jwt.sign({
    id: user._id,
    email: user.email,
    role: user.role,
    twoFAVerified,
  }, process.env.JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

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

exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) return res.status(400).json({ message: "All fields are required" });
    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) return res.status(400).json({ message: "User already exists" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: cleanEmail, password: hashed });
    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie("refreshCookie", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: ".bundlebee.co.uk",
      path: "/",
      maxAge: 604800000
    });
    logger.info(`✅ User registered: ${user.email}`);
    res.status(201).json({ accessToken });
  } catch (err) {
    logger.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

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
    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie("refreshCookie", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: ".bundlebee.co.uk",
      path: "/",
      maxAge: 604800000
    });
    logger.info(`✅ Successful login for ${user.email} from ${req.ip}`);
    await logLoginAttempt(user.email, req.ip, "success", user._id);
    res.status(200).json({ accessToken });
  } catch (err) {
    logger.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    res.clearCookie("refreshCookie", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: ".bundlebee.co.uk",
      path: "/"
    });
    logger.info(`👋 Logout from ${req.ip}`);
    res.status(200).json({ message: "Logged out successfully" });
  } catch {
    res.status(500).json({ message: "Logout failed" });
  }
};

exports.refreshToken = async (req, res) => {
  const token = req.cookies.refreshCookie;
  if (!token) return res.status(401).json({ message: "No refresh token" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ message: "Invalid token" });
    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie("refreshCookie", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: ".bundlebee.co.uk",
      path: "/",
      maxAge: 604800000
    });
    res.json({ accessToken });
  } catch (err) {
    logger.error("Refresh error:", err);
    res.status(403).json({ message: "Invalid refresh token" });
  }
};

exports.authStatus = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ isAuthenticated: false });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ isAuthenticated: false });
    res.json({
      isAuthenticated: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        twoFAVerified: user.twoFA?.enabled || user.email2FA?.verified || false
      }
    });
  } catch (err) {
    logger.error("Auth status error:", err);
    res.status(500).json({ message: "Failed to get auth status" });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    logger.error("Get profile error:", err);
    res.status(500).json({ message: "Error retrieving profile" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.resetToken = tokenHash;
    user.resetTokenExpires = Date.now() + 3600000;
    await user.save();
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${email}`;
    await sendEmail({
      to: email,
      subject: "Reset your BundleBee password",
      html: `<p>Click <a href='${resetUrl}'>here</a> to reset your password. This link expires in 1 hour.</p>`
    });
    logger.info(`🔒 Password reset token issued for ${email}`);
    res.status(200).json({ message: "Reset link sent to email" });
  } catch (err) {
    logger.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to send reset email" });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, email, newPassword } = req.body;
  try {
    if (!token || !email || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const user = await User.findOne({ email });
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
