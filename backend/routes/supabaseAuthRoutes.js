const express = require("express");
const { attachSupabaseSession } = require("../middleware/requireSupabaseAdmin");

const router = express.Router();

router.get("/session", attachSupabaseSession, (req, res) => {
  const user = req.supabase.user;
  const factors = Array.isArray(user?.factors) ? user.factors : [];

  return res.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      role: req.supabase.role,
      factors: factors.map((factor) => ({
        id: factor.id,
        factor_type: factor.factor_type,
        status: factor.status,
        friendly_name: factor.friendly_name || "",
      })),
    },
    role: req.supabase.role,
    aal: req.supabase.aal,
    isAdmin: req.supabase.role === "admin",
    mfaVerified: req.supabase.aal === "aal2",
  });
});

module.exports = router;
