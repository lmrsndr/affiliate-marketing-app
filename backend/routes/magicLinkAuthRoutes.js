const express = require("express");
const { attachSupabaseSession } = require("../middleware/requireSupabaseAdmin");

const router = express.Router();

router.get("/status", attachSupabaseSession, (req, res) => {
  return res.json({
    ok: true,
    isAuthenticated: true,
    mfaVerified: true,
    source: "supabase-magic-link",
    user: req.user,
  });
});

module.exports = router;
