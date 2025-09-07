require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const connectDB = require("./config/db");
const User = require("./models/User");
const { globalRateLimiter } = require("./controllers/authController");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const nodemailer = require("nodemailer");
const path = require("path");
const mongoose = require("mongoose"); // for /api/ready
const assertCsp = require("./middleware/assertCsp"); // ✅ tight CSP dev safeguard
const requireVerified2FA = require("./middleware/requireVerified2FA"); // ✅ 2FA gate for protected APIs

// ───────────────────────────────────────────────────────────────
// ENV + sanity checks
// ───────────────────────────────────────────────────────────────
const {
  NODE_ENV = "development",
  MONGO_URI,
  SESSION_SECRET,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_OTP_SECRET,                 // optional (falls back to JWT_SECRET if not set)
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  CORS_ORIGINS,
  COOKIE_DOMAIN = ".bundlebee.co.uk",
  EMAIL_ZOHO,
  PASS_ZOHO,
} = process.env;

const rawPort = process.env.PORT;
const PORT =
  typeof rawPort === "string" && rawPort.trim() !== "" && !Number.isNaN(Number(rawPort))
    ? Number(rawPort)
    : 5000;

[
  ["MONGO_URI", MONGO_URI],
  ["JWT_SECRET", JWT_SECRET],
  ["JWT_REFRESH_SECRET", JWT_REFRESH_SECRET],
  ["SESSION_SECRET", SESSION_SECRET],
  ["GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID],
  ["GOOGLE_CLIENT_SECRET", GOOGLE_CLIENT_SECRET],
  ["GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI],
].forEach(([key, val]) => {
  if (!val) {
    console.error(`❌ Missing env variable: ${key}`);
    process.exit(1);
  }
});

const IS_PROD = NODE_ENV === "production";

// ───────────────────────────────────────────────────────────────
// Mailer (Zoho)
// ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.eu",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_ZOHO,
    pass: PASS_ZOHO,
  },
});

// ───────────────────────────────────────────────────────────────
// App init
// ───────────────────────────────────────────────────────────────
const app = express();
app.set("trust proxy", 1);

// DB
connectDB();

// Global rate limiter
app.use(globalRateLimiter);

// ───────────────────────────────────────────────────────────────
// Security headers (tight API CSP)
// ───────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'none'"],
        "connect-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "frame-ancestors": ["'none'"],
        "base-uri": ["'none'"],
        "form-action": ["'none'"],
        "object-src": ["'none'"],
        "script-src": ["'none'"],
        "script-src-attr": ["'none'"],
      }
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ✅ Assert CSP middleware (dev safeguard)
app.use(assertCsp(NODE_ENV));

// CORS
const fallbackOrigins = ["https://bundlebee.co.uk", "https://www.bundlebee.co.uk", "http://localhost:5173"];
const parsedAllowlist = (CORS_ORIGINS ? CORS_ORIGINS.split(",") : fallbackOrigins)
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || parsedAllowlist.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parsers & performance
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session
app.use(
  session({
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60,
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: process.env.COOKIE_NAME || "sid",
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "None" : "Lax",
      domain: IS_PROD ? COOKIE_DOMAIN : undefined,
      path: "/",
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_REDIRECT_URI,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            profilePicture: profile.photos?.[0]?.value || null,
            role: process.env.EMAIL_USER === profile.emails[0].value ? "admin" : "user",
            twoFAVerified: false,
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

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

// ───────────────────────────────────────────────────────────────
// Routes
// ───────────────────────────────────────────────────────────────
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// ✅ 2FA-aware Google OAuth callback
(() => {
  const handler = async (req, res) => {
    try {
      const cookieOpts = {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: IS_PROD ? "None" : "Lax",
        domain: IS_PROD ? COOKIE_DOMAIN : undefined,
        path: "/",
      };

      // If this account requires 2FA (app or verified email 2FA), DO NOT issue real cookies yet.
      const twoFAEnabled = !!(req.user?.twoFA?.enabled || req.user?.email2FA?.verified);

      if (twoFAEnabled) {
        const otpTicket = jwt.sign(
          { sub: String(req.user._id), purpose: "otp" },
          JWT_OTP_SECRET || JWT_SECRET,
          { expiresIn: 300 } // 5 minutes
        );
        res.cookie("otpTicket", otpTicket, { ...cookieOpts, maxAge: 5 * 60 * 1000 });
        return res.redirect("https://bundlebee.co.uk/setup-2fa?oauth=1");
      }

      // Otherwise: no 2FA required -> issue cookies with mfaVerified:true
      const accessToken = jwt.sign(
        { id: req.user._id, email: req.user.email, role: req.user.role, mfaVerified: true },
        JWT_SECRET,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { id: req.user._id, role: req.user.role, mfaVerified: true },
        JWT_REFRESH_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("authCookie", accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
      res.cookie("refreshCookie", refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

      return res.redirect("https://bundlebee.co.uk/auth/callback");
    } catch (err) {
      console.error("❌ OAuth error:", err);
      return res.redirect("https://bundlebee.co.uk/login?error=server");
    }
  };

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "https://bundlebee.co.uk/login?error=unauthorized",
      session: false,
    }),
    handler
  );
})();

app.get("/auth/logout", (req, res) => {
  const cookieOpts = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "None" : "Lax",
    domain: IS_PROD ? COOKIE_DOMAIN : undefined,
    path: "/",
  };
  res.clearCookie("refreshCookie", cookieOpts);
  res.clearCookie("authCookie", cookieOpts);

  req.logout((err) => {
    if (err) return res.status(500).json({ success: false, message: "Logout failed" });
    res.json({ success: true, message: "✅ Logged out" });
  });
});

// Test cookie
app.get("/api/test-cookie", (req, res) => {
  res.cookie("test_cookie", "yes", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "None" : "Lax",
    domain: IS_PROD ? COOKIE_DOMAIN : undefined,
    path: "/",
  });
  res.send("✅ test_cookie set");
});

// Health & readiness
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));
app.get("/api/health", (_req, res) => res.status(200).json({ ok: true }));
app.get("/api/ready", (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  return res.status(ready ? 200 : 503).json({ ready });
});

// Root info
app.get("/", (_req, res) => {
  res.send("✅ API root is reachable. Try /api/health or /api/ready.");
});

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// API routes
app.use("/api/auth", require("./routes/authRoutes"));

// ✅ Enforce verified 2FA for admin & partner APIs
app.use("/api/admin", requireVerified2FA, require("./routes/adminRoutes"));
app.use("/api/partner", requireVerified2FA, require("./routes/partnerRoutes"));

app.use("/api/boxes", require("./routes/boxRoutes"));
app.use("/api", require("./routes/subscriptionRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/quiz", require("./routes/quizRoutes"));
app.use("/api/interactions", require("./routes/interactionRoutes"));
app.use("/api/2fa-email", require("./routes/email2FARoutes"));
app.use("/api/2fa", require("./routes/twoFARoutes"));
app.use("/api/accounting", require("./routes/accountingRoutes"));
app.use("/api/2fa-app", require("./routes/totpRoutes"));

// 404
app.use((req, res) => res.status(404).json({ msg: "API route not found" }));

// Start
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (${NODE_ENV})`));
