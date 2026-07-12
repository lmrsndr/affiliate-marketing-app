const express = require("express");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const { listAdminUsers } = require("../services/supabaseAuth");

const router = express.Router();
router.use(requireVerified2FA);

router.get("/", async (_req, res) => {
  try {
    const result = await listAdminUsers(1, 1000);
    const users = Array.isArray(result?.users) ? result.users : [];
    return res.json(
      users
        .sort((a, b) => String(a.email || "").localeCompare(String(b.email || "")))
        .map((user) => ({
          _id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email,
          role: "admin",
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at || null,
        }))
    );
  } catch (error) {
    console.error("Unable to list approved administrators:", error);
    return res.status(500).json({ message: "Unable to load administrator accounts" });
  }
});

router.all("*", (_req, res) => {
  return res.status(405).json({
    message: "Administrator accounts are managed in Supabase and the Render allow-list.",
  });
});

module.exports = router;
