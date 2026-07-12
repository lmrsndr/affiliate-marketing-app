const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const mongoose = require("mongoose");
const path = require("path");
const rateLimit = require("express-rate-limit");

const runtime = require("./config/runtime");
const { corsMiddleware } = require("./config/http");
const assertCsp = require("./middleware/assertCsp");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(corsMiddleware);
app.options("*", corsMiddleware);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
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
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
    standardHeaders: true,
    legacyHeaders: false,
  })
);

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

// Supabase magic-link sessions are the sole administrator authentication path.
app.use("/api/supabase", require("./routes/supabaseAuthRoutes"));
app.use("/api/admin/users", require("./routes/adminUserRoutes"));

// Active shopping platform plus temporary legacy catalogue compatibility.
app.use("/api/boxes", require("./routes/boxRoutes"));
app.use("/api", require("./routes/subscriptionRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));

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
