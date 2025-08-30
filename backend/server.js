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

// ───────────────────────────────────────────────────────────────
// ENV + sanity checks
// ───────────────────────────────────────────────────────────────
const {
  NODE_ENV = "development",
  PORT = 5000,
  MONGO_URI,
  SESSION_SECRET,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  CORS_ORIGINS,                 // e.g. "https://bundlebee.co.uk,https://www.bundlebee.co.uk,http://localhost:5173"
  COOKIE_DOMAIN = ".bundlebee.co.uk", // only used in production
  EMAIL_ZOHO,
  PASS_ZOHO,
} = process.env;

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
// Mailer (Zoho) — unchanged
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

// Secure cookies behind a proxy (Render/Heroku/Nginx)
app.set("trust proxy", 1);

// DB
connectDB();

// Global rate limiter (perimeter)
app.use(globalRateLimiter);

// Helmet (with a safe CSP baseline for APIs)
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "https:"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"], // allow inline styles for simplicity
        "connect-src": ["'self'"],
        "frame-ancestors": ["'none'"],
        "upgrade-insecure-requests": [],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS allow-list from env (plus a sensible default for your domain)
const fallbackOrigins = ["https://bundlebee.co.uk", "https://www.bundlebee.co.uk", "http://localhost:5173"];
const parsedAllowlist = (CORS_ORIGINS ? CORS_ORIGINS.split(",") : fallbackOrigins)
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow server-to-server & curl (no origin) and allowlisted origins
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

// Session for Passport/Google
app.use(
  session({
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60, // 14 days
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: process.env.COOKIE_NAME || "sid",
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: IS_PROD, // secure only in prod
      sameSite: IS_PROD ? "None" : "Lax",
      domain: IS_PROD ? COOKIE_DOMAIN : undefined,
      path: "/",
    },
  })
);

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Strategy — unchanged logic, just using env safely
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_REDIRECT_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
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
// OAuth routes — unchanged
// ───────────────────────────────────────────────────────────────
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://bundlebee.co.uk/login?error=unauthorized",
    session: false,
  }),
  async (req, res) => {
    try {
      const accessToken = jwt.sign(
        {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          twoFAVerified: req.user.twoFAVerified || false,
        },
        JWT_SECRET,
        { expiresIn: "15m" }
      );

      const refreshToken = jwt.sign({ id: req.user._id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

      // cookie options dynamic by env
      const cookieOpts = {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: IS_PROD ? "None" : "Lax",
        domain: IS_PROD ? COOKIE_DOMAIN : undefined,
        path: "/",
      };

      res.cookie("authCookie", accessToken, { ...cookieOpts, maxAge: 15 * 60 * 1000 });
      res.cookie("refreshCookie", refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

      const redirectURL = `https://bundlebee.co.uk/auth/callback?accessToken=${accessToken}`;
      return res.redirect(redirectURL);
    } catch (err) {
      console.error("❌ OAuth error:", err);
      return res.redirect("https://bundlebee.co.uk/login?error=server");
    }
  }
);

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

// Test cookie route — unchanged, but env-aware cookies
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

// Health + Root
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => {
  res.send("✅ API root is reachable. Try /health or your /api/* routes.");
});

// Static uploads (if you use them)
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// ───────────────────────────────────────────────────────────────
// API routes — unchanged
// ───────────────────────────────────────────────────────────────
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
app.use("/api/2fa-app", require("./routes/totpRoutes"));

// 404
app.use((req, res) => res.status(404).json({ msg: "API route not found" }));

// Start
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (${NODE_ENV})`));
