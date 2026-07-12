const { authenticateAccessToken } = require("../services/supabaseAuth");

function bearerToken(req) {
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

async function attachSupabaseSession(req, res, next) {
  try {
    const token = bearerToken(req);
    const session = await authenticateAccessToken(token);
    req.supabase = { ...session, accessToken: token };
    req.user = {
      id: session.user.id,
      _id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.name || session.user.email,
      role: "admin",
    };
    return next();
  } catch (error) {
    const status = Number(error.status) === 403 ? 403 : 401;
    return res.status(status).json({
      message: status === 403 ? error.message : "Supabase authentication required",
      reason: status === 403 ? "ADMIN_EMAIL_NOT_APPROVED" : "SUPABASE_AUTH_REQUIRED",
    });
  }
}

module.exports = {
  attachSupabaseSession,
  requireSupabaseAdmin: [attachSupabaseSession],
};
