const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  getUserProfile,
  resetPassword,
  forgotUsername,
  generateTokens,
  isTrustedDevice,
  trustThisDevice,
} = require("../controllers/authController");

const email2FAController = require("../controllers/email2FAController");
const totpController = require("../controllers/totpController");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function extractAccessToken(req) {
  let token = req.cookies.authCookie;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  return token;
}

router.get("/", (req, res) => {
  res.send("✅ Auth route is operational");
});

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logoutUser);
router.get("/refresh", refreshToken);
router.post("/reset-password", resetPassword);
router.post("/forgot-username", forgotUsername);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "consent",
    accessType: "offline",
    response_type: "code",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=OAuthFailed`,
    session: false,
  }),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=unauthorized`);
      }

      const trusted = isTrustedDevice(req);
      req.session.awaiting2FA = !trusted;

      const { accessToken, refreshToken } = generateTokens(req.user, req.session);

      res.cookie("refreshCookie", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: ".bundlebee.co.uk",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?accessToken=${accessToken}`;
      return res.redirect(redirectUrl);
    } catch (err) {
      console.error("❌ OAuth Callback Error:", err);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=OAuthFailed`);
    }
  }
);

router.post("/set-cookie", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Missing refreshToken" });
  }

  res.cookie("refreshCookie", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    domain: ".bundlebee.co.uk",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({ message: "✅ Refresh token cookie set" });
});

router.post("/trust-device", authMiddleware, trustThisDevice);

// ✅ Auth Status Check (2FA enforcement included)
router.get("/status", async (req, res) => {
  const token = extractAccessToken(req);
  if (!token) return res.json({ isAuthenticated: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ isAuthenticated: false });

    // 🛡️ Session-level 2FA enforcement
    const awaiting2FA = req.session?.awaiting2FA === true;

    // ✅ Only trust token if session is NOT awaiting 2FA
    const tokenVerified = decoded.twoFAVerified === true && !awaiting2FA;

    // ✅ OR user has already completed TOTP/email 2FA
    const dbVerified = user?.email2FA?.verified || user?.twoFA?.enabled;

    const isVerified = tokenVerified || dbVerified;

    return res.json({
      isAuthenticated: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        twoFAVerified: isVerified,
      },
      accessToken: token,
    });
  } catch (err) {
    console.warn("⚠️ Invalid or expired access token");
    return res.json({ isAuthenticated: false });
  }
});


router.get("/enabled-views", async (req, res) => {
  const token = extractAccessToken(req);
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("enabledViews");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ enabledViews: user.enabledViews });
  } catch (error) {
    console.error("❌ Error fetching enabled views:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("❌ Error retrieving user profile:", err);
    res.status(500).json({ message: "Error retrieving user" });
  }
});

router.get("/me", async (req, res) => {
  const token = extractAccessToken(req);
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    const isVerified = user?.email2FA?.verified || user?.twoFA?.enabled || false;

    return res.json({
      id: user._id,
      email: user.email,
      role: user.role,
      twoFAVerified: isVerified,
    });
  } catch (err) {
    console.error("❌ Failed to decode token:", err);
    return res.status(401).json({ message: "Invalid token" });
  }
});

router.post("/2fa-email/send", authMiddleware, email2FAController.sendEmail2FACode);
router.post("/2fa-email/verify", authMiddleware, email2FAController.verifyEmail2FACode);
router.post("/2fa-email/resend", authMiddleware, email2FAController.resendEmail2FACode);

router.get("/2fa-app/setup", authMiddleware, totpController.generateTOTPSecret);
router.post("/2fa-app/verify", authMiddleware, totpController.verifyTOTP);

module.exports = router;
