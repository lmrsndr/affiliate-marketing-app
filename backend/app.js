const express = require("express");
const helmet = require("helmet");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const mongoose = require("mongoose");
const path = require("path");

const runtime = require("./config/runtime");
const passport = require("./config/passport");
const { corsMiddleware } = require("./config/http");
const assertCsp = require("./middleware/assertCsp");
const { globalRateLimiter } = require("./controllers/authController");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(corsMiddleware);
app.options("*", corsMiddleware);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
app.use(assertCsp(runtime.nodeEnv));
app.use(globalRateLimiter);

app.use(
  session({
    store: MongoStore.create({
      mongoUrl: runtime.mongoUri,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60,
    }),
    secret: runtime.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: runtime.cookieName,
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: runtime.isProduction,
      sameSite: runtime.isProduction ? "None" : "Lax",
      domain: runtime.isProduction && runtime.cookieDomain ? runtime.cookieDomain : undefined,
      path: "/",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

if (!runtime.isProduction) {
  app.get("/__bb/health", (_req, res) => res.json({ ok: true, environment: runtime.nodeEnv }));
}

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/ready", (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  return res.status(ready ? 200 : 503).json({ ready });
});
app.get("/", (_req, res) => res.send("BundleBee API is reachable. Try /api/health or /api/ready."));

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use("/auth", require("./routes/googleAuthRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/auth/local", require("./routes/localAuthRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/partner", require("./routes/partnerRoutes"));
app.use("/api/boxes", require("./routes/boxRoutes"));
app.use("/api", require("./routes/subscriptionRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/quiz", require("./routes/quizRoutes"));
app.use("/api/interactions", require("./routes/interactionRoutes"));
app.use("/api/2fa-email", require("./routes/email2FARoutes"));
app.use("/api/accounting", require("./routes/accountingRoutes"));
app.use("/api/2fa-app", require("./routes/totpRoutes"));

app.use((req, res) => {
  res.status(404).json({ message: "API route not found" });
});

app.use((error, _req, res, _next) => {
  if (error?.message?.startsWith("Origin is not allowed by CORS")) {
    return res.status(403).json({ message: "Origin is not allowed" });
  }

  console.error("Unhandled API error:", error);
  return res.status(500).json({ message: "Unexpected server error" });
});

module.exports = app;
