const attachUserIfPresent = require('./middleware/attachUserIfPresent');
const authRoutes = require('./routes/authRoutes');
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
app.get('/api/auth/debug/cookies', (req, res) => {
  res.json({
    ok: true,
    saw: {
      hasAuth: !!(req.cookies && req.cookies.authCookie),
      hasRefresh: !!(req.cookies && req.cookies.refreshCookie)
    },
    host: req.headers['host'],
    xfh: req.headers['x-forwarded-host'] || null
  });
});});

















// --- BB WHOAMI (debug-only) ---
app.get('/api/auth/whoami', attachUserIfPresent, (req, res) => {
  res.json({
    ok: true,
    sawCookies: {
      authCookie: !!(req.cookies && req.cookies.authCookie),
      refreshCookie: !!(req.cookies && req.cookies.refreshCookie),
    },
    auth: req.auth || null,
    user: res.locals.user || null,
    where: 'whoami'
  });
});
// --- END BB WHOAMI ---
// --- BB CANONICAL CORS (early) ---
app.set('trust proxy', 1);
app.use(cookieParser());

const BB_ALLOWED_ORIGINS = [
  /^https?:\/\/(www\.)?bundlebee\.co\.uk$/,
  /^https?:\/\/bundlebee\.co\.uk$/,
  // allow any subdomain like api., staging., preview.
  /^https?:\/\/([a-z0-9-]+\.)*bundlebee\.co\.uk$/,
  // local dev (optional)
  /^http:\/\/localhost:\d+$/
];

const bbCors = cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl / server-to-server
    const ok = BB_ALLOWED_ORIGINS.some(re => re.test(origin));
    return ok ? cb(null, true) : cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
});

// Preflight & main
app.options('*', bbCors);
app.use(bbCors);
// --- END BB CANONICAL CORS ---

// --- BB ROUTE DUMPER ---
function bbListEndpoints(app) {
  const out = [];
  function pushRoute(base, r) {
    const methods = Object.keys(r.methods || {}).filter(Boolean);
    out.push({ path: (base ? base + r.path : r.path), methods });
  }
  app._router?.stack?.forEach((layer) => {
    if (layer.route) {
      pushRoute('', layer.route);
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const base = (layer.regexp && layer.regexp.fast_star) ? '*' :
                   (layer.regexp && layer.regexp.fast_slash) ? '/' :
                   (layer.regexp && layer.regexp.toString().replace(/^\/(\^)?/, '/').replace(/\/?\?.*$/, '')) || '';
      layer.handle.stack.forEach((subl) => { if (subl.route) pushRoute(base, subl.route); });
    }
  });
  return out;
}
app.get('/__bb/routes', (_req, res) => { res.json({ ok: true, routes: bbListEndpoints(app) }); });
// --- END BB ROUTE DUMPER ---
// --- BB GLOBAL LOGGER + SIGNATURE ---
app.use((req, res, next) => {
  res.setHeader('x-bb-sig', 'bb-sig-early-auth-20250909');
  if (req.path && req.path.startsWith('/api/auth')) {
    console.log('🛰  [REQ]', req.method, req.path);
  }
  next();
});
// --- END BB GLOBAL LOGGER + SIGNATURE ---
// --- BB EARLY AUTH ROUTES (deterministic, no inner require) ---
if (!app._bbAuthEarlyAdded) {
  // very early ping to prove routing works in prod
  app.get('/api/auth/__ping', (_req, res) => res.json({ ok: true, ping: 'auth-early' }));

  // use the top-level import: const attachUserIfPresent = require('./middleware/attachUserIfPresent');
  app.get('/api/auth/status', attachUserIfPresent, (req, res) => {
    const user = res.locals.user || null;
    const mfaVerified = !!(req.auth && req.auth.mfaVerified);
    res.json({ ok: true, user, mfaVerified, source: req.auth?.source || null, where: 'early' });
  });

  app.get('/api/auth/next', attachUserIfPresent, (req, res) => {
    const mfaVerified = !!(req.auth && req.auth.mfaVerified);
    if (!req.auth?.isAuthenticated) return res.json({ ok: true, next: 'login', where: 'early' });
    if (!mfaVerified) return res.json({ ok: true, next: 'verify-2fa', where: 'early' });
    return res.json({ ok: true, next: 'dashboard', where: 'early' });
  });

  app._bbAuthEarlyAdded = true;
}
// --- END BB EARLY AUTH ROUTES (deterministic) ---

// --- BB HEALTH ROUTES (early) ---
try {
  if (!app._bbHealthAdded) {
    app.get('/__bb/health', (_req, res) => res.status(200).json({ ok: true, where: '__bb' }));
    app.get('/api/health',   (_req, res) => res.status(200).json({ ok: true, where: 'api' }));
    app._bbHealthAdded = true;
  }
} catch (e) { console.error('health routes error', e); }
// --- END BB HEALTH ROUTES ---

// >>> BB AUTH MOUNT START >>>
try {
  const __bb_attachUserIfPresent = require('./middleware/attachUserIfPresent');
  const __bb_authRoutes = require('./routes/authRoutes');
  const __bb_cors = require('cors');
  const __bb_cookieParser = require('cookie-parser');

  if (typeof app?.set === 'function') app.set('trust proxy', 1);
  if (typeof app?.use === 'function') app.use(__bb_cookieParser());

  const origins = [
    /^https?:\/\/(www\.)?bundlebee\.co\.uk$/,
    /^https?:\/\/bundlebee\.co\.uk$/,
    /^https?:\/\/(.*\.)?bundlebee\.co\.uk$/
  ];
  if (typeof app?.use === 'function') app.use(__bb_cors({ origin: origins, credentials: true }));

  if (typeof app?.use === 'function') app.use('/api/auth', __bb_attachUserIfPresent, __bb_authRoutes);
} catch (e) { console.error('BB auth mount failed:', e); }
// <<< BB AUTH MOUNT END <<<

app.use(cookieParser());
app.set('trust proxy', 1); // needed for Secure cookies behind proxy
{
  const origins = [
    /^https?:\/\/(www\.)?bundlebee\.co\.uk$/,
    /^https?:\/\/bundlebee\.co\.uk$/,
    // optional: any subdomain like api., staging., etc.
    /^https?:\/\/([a-z0-9-]+\.)*bundlebee\.co\.uk$/
  ];
  /* removed old CORS block */
}
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

/* removed old CORS block */

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
// Cookie options helper (derive domain from request host)
// ───────────────────────────────────────────────────────────────
function getCookieBaseDomain(req) {
  // Prefer configured env, else infer from Host header
  const envDom = process.env.COOKIE_DOMAIN;
  if (envDom && envDom.trim()) return envDom.trim();

  const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  // If host ends with .bundlebee.co.uk (api.bundlebee.co.uk, staging...), pin to parent
  if (host.endsWith('.bundlebee.co.uk') || host === 'bundlebee.co.uk') {
    return '.bundlebee.co.uk';
  }
  // Fallback: no explicit Domain (host-only cookie)
  return undefined;
}

function getCookieOpts(req) {
  const IS_HTTPS = true; // Render + Cloudflare are HTTPS
  const baseDomain = getCookieBaseDomain(req);
  return {
    httpOnly: true,
    secure: IS_HTTPS,
    sameSite: 'None',
    domain: baseDomain,     // .bundlebee.co.uk when applicable
    path: '/',
  };
}

// ───────────────────────────────────────────────────────────────
// Routes
// ───────────────────────────────────────────────────────────────
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// ✅ 2FA-aware Google OAuth callback
(() => {
  const handler = async (req, res) => {
    try {
      const cookieOpts = getCookieOpts(req);

      // If this account requires 2FA (app or verified email 2FA), DO NOT issue real cookies yet.
      const twoFAEnabled = !!(req.user?.twoFA?.enabled || req.user?.email2FA?.enabled);

      if (twoFAEnabled) {
      // 🧹 Clear any stale cookies before starting a new 2FA session
      res.clearCookie("authCookie",  cookieOpts);
      res.clearCookie("refreshCookie", cookieOpts);
      try {
        await User.updateOne({ _id: req.user._id }, { $set: { "email2FA.verified": false } });
      } catch (e) { console.warn("email2FA reset failed:", e?.message || e); }
    // ✅ Short-lived pre-2FA refresh cookie to allow /api/2fa-* endpoints (not a full session)
    const preRefresh = jwt.sign(
      { id: req.user._id, role: req.user.role, mfaVerified: false, purpose: "pre2fa" },
      JWT_REFRESH_SECRET,
      { expiresIn: "30m" }
    );
    res.cookie("refreshCookie", preRefresh, getCookieOpts(req));


        const otpTicket = jwt.sign(
          { sub: String(req.user._id), purpose: "otp" },
          JWT_OTP_SECRET || JWT_SECRET,
          { expiresIn: 300 } // 5 minutes
        );
        res.cookie("otpTicket", otpTicket, getCookieOpts(req));
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

      res.cookie("authCookie", accessToken, getCookieOpts(req));
      res.cookie("refreshCookie", refreshToken, getCookieOpts(req));

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
    res.cookie("test_cookie", "yes", getCookieOpts(req));
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
app.use("/api/auth", require("./routes/localAuthRoutes")); // alias so /api/auth/register works
app.use("/api/auth/local", require("./routes/localAuthRoutes"));

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
app.use("/api/accounting", require("./routes/accountingRoutes"));
app.use("/api/2fa-app", require("./routes/totpRoutes"));

// 404
app.use((req, res, next) => {
  const p = req.path || req.url || '';
  // let /api/auth/* and /__bb/* flow to later handlers
  if (p.startsWith('/api/auth') || p.startsWith('/__bb/')) return next();
  return res.status(404).json({ msg: "API route not found" });


// Start
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (${NODE_ENV})`));



