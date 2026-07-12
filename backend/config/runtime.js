require("dotenv").config();

const required = [
  "MONGO_URI",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "BUNDLEBEE_ADMIN_EMAILS",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const nodeEnv = process.env.NODE_ENV || "development";
const frontendOrigin = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
const portValue = Number(process.env.PORT || 5000);
const adminEmails = new Set(
  String(process.env.BUNDLEBEE_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);

module.exports = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: Number.isFinite(portValue) ? portValue : 5000,
  mongoUri: process.env.MONGO_URI,
  supabaseUrl: process.env.SUPABASE_URL.replace(/\/+$/, ""),
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  adminEmails,
  frontendOrigin,
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
};
