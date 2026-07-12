const express = require("express");
const { attachSupabaseSession } = require("../middleware/requireSupabaseAdmin");

const router = express.Router();

router.get("/session", attachSupabaseSession, (req, res) => {
  const user = req.supabase.user;
  return res.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      role: "admin",
    },
    role: "admin",
    isAdmin: true,
  });
});

module.exports = router;
