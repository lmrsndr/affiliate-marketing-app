require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const User = require("./models/User");
const { globalRateLimiter } = require("./controllers/authController");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const nodemailer = require("nodemailer");

// ✅ Email Transporter (Zoho)
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.eu",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_ZOHO,
    pass: process.env.PASS_ZOHO,
  },
});

// ✅ Check essential env vars
[
  "MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET", "SESSION_SECRET",
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"
].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing env variable: ${key}`);
    process.exit(1);
  }
});

const app = express();

// ✅ Connect MongoDB
connectDB();

// ✅ Global Rate Limiter (Apply early)
app.use(globalRateLimiter);

// ✅ Security Middleware
app.use(helmet());
app.use(cors({
  origin: "https://bundlebee.co.uk",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Session Middleware
app.use(session({
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "sessions",
    ttl: 14 * 24 * 60 * 60
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000,
    secure: true,
    httpOnly: true,
    sameSite: "None",
    domain: ".bundlebee.co.uk",
    path: "/"
  }
}));

// ✅ Passport Init
app.use(passport.initialize());
app.use(passport.session());

// ✅ Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_REDIRECT_URI
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        profilePicture: profile.photos?.[0]?.value || null,
        role: process.env.EMAIL_USER === profile.emails[0].value ? "admin" : "user",
        twoFAVerified: false
      });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (!user) return done(null, false);
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
});

// ✅ Google OAuth Entry
app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"]
}));

// ✅ Google OAuth Callback
app.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://bundlebee.co.uk/login?error=unauthorized",
    session: false
  }),
  async (req, res) => {
    try {
      const accessToken = jwt.sign({
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        twoFAVerified: req.user.twoFAVerified || false
      }, process.env.JWT_SECRET, { expiresIn: "15m" });

      const refreshToken = jwt.sign(
        { id: req.user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("authCookie", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: ".bundlebee.co.uk",
        path: "/",
        maxAge: 15 * 60 * 1000
      });

      res.cookie("refreshCookie", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        domain: ".bundlebee.co.uk",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      const redirectURL = `https://bundlebee.co.uk/auth/callback?accessToken=${accessToken}`;
      return res.redirect(redirectURL);
    } catch (err) {
      console.error("❌ OAuth error:", err);
      return res.redirect("https://bundlebee.co.uk/login?error=server");
    }
  }
);

// ✅ Logout Route
app.get("/auth/logout", (req, res) => {
  res.clearCookie("refreshCookie", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    domain: ".bundlebee.co.uk",
    path: "/"
  });
  res.clearCookie("authCookie", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    domain: ".bundlebee.co.uk",
    path: "/"
  });

  req.logout(err => {
    if (err) return res.status(500).json({ success: false, message: "Logout failed" });
    res.json({ success: true, message: "✅ Logged out" });
  });
});

// ✅ Test Cookie Route
app.get("/api/test-cookie", (req, res) => {
  res.cookie("test_cookie", "yes", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    domain: ".bundlebee.co.uk",
    path: "/"
  });
  res.send("✅ test_cookie set");
});

// ✅ Root Route (NEW — avoids 404 on bare /)
app.get("/", (req, res) => {
  res.send("✅ API root is reachable. Try /api/auth/status or another route.");
});

// ✅ API Route Mounting
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/boxes", require("./routes/boxRoutes"));
app.use("/api", require("./routes/subscriptionRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/quiz", require("./routes/quizRoutes"));
app.use("/api/interactions", require("./routes/interactionRoutes"));
app.use("/api/partner", require("./routes/partnerRoutes"));
app.use("/api/2fa-email", require("./routes/email2FARoutes"));
app.use("/api/2fa", require("./routes/twoFARoutes"));
app.use("/api/accounting", require("./routes/accountingRoutes"));

// ✅ 404 Handler
app.use((req, res) => res.status(404).json({ msg: "API route not found" }));

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
