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
} = require("../controllers/authController");

const email2FAController = require("../controllers/email2FAController");
const totpController = require("../controllers/totpController");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Utility to extract token from headers or cookies
function extractAccessToken(req) {
  let token = req.cookies.authCookie;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  return token;
}

// ✅ Confirm Route is Working
router.get("/", (req, res) => {
  res.send("✅ Auth route is operational");
});

// ✅ Register
router.post("/register", registerUser);

// ✅ Login
router.post("/login", loginUser);

// ✅ Logout
router.get("/logout", logoutUser);

// ✅ Refresh Token
router.get("/refresh", refreshToken);

// ✅ Password Reset
router.post("/reset-password", resetPassword);

// ✅ Forgot Username
router.post("/forgot-username", forgotUsername);

// ✅ Google OAuth Start
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "consent",
    accessType: "offline",
    response_type: "code",
  })
);

// ✅ Google OAuth Callback with Trusted Device + 2FA Logic
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

      // 🔐 Check if device is trusted
      const trusted = isTrustedDevice(req);
      req.session.awaiting2FA = !trusted;

      // ✅ Generate tokens
      const { accessToken, refreshToken } = generateTokens(req.user, req.session);

      // ✅ Set refresh token in secure cookie
      res.cookie("refreshCookie", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: ".bundlebee.co.uk",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // ✅ Redirect with access token
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?accessToken=${accessToken}`;
      return res.redirect(redirectUrl);
    } catch (err) {
      console.error("❌ OAuth Callback Error:", err);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=OAuthFailed`);
    }
  }
);

// ✅ Set refresh cookie (for OAuth Option 1)
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


// ✅ Auth Status Check (used in Vue beforeEach guard)
router.get("/status", async (req, res) => {
  const token = extractAccessToken(req);
  if (!token) return res.json({ isAuthenticated: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    const isVerified = req.session?.awaiting2FA === false;

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



// ✅ Get enabled views for user
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

// ✅ User Profile
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

// ✅ /auth/me — Get current user from access or refresh token
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

// ✅ Email 2FA Routes (integrates cooldown logic in controller)
router.post("/2fa-email/send", authMiddleware, email2FAController.sendEmail2FACode);
router.post("/2fa-email/verify", authMiddleware, email2FAController.verifyEmail2FACode);
router.post("/2fa-email/resend", authMiddleware, email2FAController.resendEmail2FACode);

module.exports = router;
