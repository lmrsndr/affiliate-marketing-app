const { attachSupabaseSession } = require("./requireSupabaseAdmin");

// Compatibility name retained for existing route imports. Authentication is now
// Supabase magic-link only and access is restricted by the configured email list.
module.exports = attachSupabaseSession;
