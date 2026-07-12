const cors = require("cors");
const runtime = require("./runtime");

function allowedOrigin(origin) {
  if (!origin) return true;

  const configured = new Set([
    runtime.frontendOrigin,
    "http://localhost:5173",
    ...runtime.corsOrigins,
  ]);

  if (configured.has(origin)) return true;

  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      (url.hostname === "bundlebee.co.uk" || url.hostname.endsWith(".bundlebee.co.uk"))
    );
  } catch (_error) {
    return false;
  }
}

const corsMiddleware = cors({
  origin(origin, callback) {
    if (allowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`Origin is not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

function cookieDomain(req) {
  if (runtime.cookieDomain) return runtime.cookieDomain;

  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(":")[0]
    .toLowerCase();

  if (host === "bundlebee.co.uk" || host.endsWith(".bundlebee.co.uk")) {
    return ".bundlebee.co.uk";
  }

  return undefined;
}

function authCookieOptions(req, overrides = {}) {
  return {
    httpOnly: true,
    secure: runtime.isProduction,
    sameSite: runtime.isProduction ? "None" : "Lax",
    domain: runtime.isProduction ? cookieDomain(req) : undefined,
    path: "/",
    ...overrides,
  };
}

module.exports = {
  corsMiddleware,
  cookieDomain,
  authCookieOptions,
};
