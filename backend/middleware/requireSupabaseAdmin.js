const { authenticateAccessToken } = require("../services/supabaseAuth");

function bearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.replace(/^Bearer\s+/i, "").trim();
}

async function attachSupabaseSession(req, res, next) {
  try {
    const token = bearerToken(req);
    const session = await authenticateAccessToken(token);
    req.supabase = { ...session, accessToken: token };
    return next();
  } catch (error) {
    const status = Number(error.status) || 401;
    return res.status(status === 403 ? 403 : 401).json({
      message: status === 403 ? "Supabase session is not authorised" : "Supabase authentication required",
      reason: "SUPABASE_AUTH_REQUIRED",
    });
  }
}

function requireSupabaseAdmin(req, res, next) {
  if (req.supabase?.role !== "admin") {
    return res.status(403).json({
      message: "Administrator access only",
      reason: "ADMIN_REQUIRED",
    });
  }

  if (req.supabase?.aal !== "aal2") {
    return res.status(403).json({
      message: "Authenticator verification required",
      reason: "MFA_AAL2_REQUIRED",
    });
  }

  req.user = {
    id: req.supabase.user.id,
    _id: req.supabase.user.id,
    email: req.supabase.user.email,
    name: req.supabase.user.user_metadata?.name || req.supabase.user.email,
    role: "admin",
  };

  return next();
}

module.exports = {
  attachSupabaseSession,
  requireSupabaseAdmin: [attachSupabaseSession, requireSupabaseAdmin],
};
