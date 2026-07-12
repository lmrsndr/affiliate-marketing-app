const express = require("express");

const requireVerified2FA = require("../middleware/requireVerified2FA");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  createAdminUser,
  deleteSupabaseUser,
  deleteUserFactor,
  listAdminUsers,
  listUserFactors,
  supabaseRequest,
  updateSupabaseUser,
} = require("../services/supabaseAuth");

const router = express.Router();
router.use(requireVerified2FA, roleMiddleware("admin"));

function isBanned(user) {
  if (!user?.banned_until) return false;
  return new Date(user.banned_until).getTime() > Date.now();
}

function publicUser(user) {
  const factors = Array.isArray(user?.factors) ? user.factors : [];
  const identities = Array.isArray(user?.identities) ? user.identities : [];
  return {
    _id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email,
    role: user.app_metadata?.role || "user",
    suspended: isBanned(user),
    localEnabled: identities.some((identity) => identity.provider === "email") || Boolean(user.email),
    googleEnabled: identities.some((identity) => identity.provider === "google"),
    email2FAEnabled: false,
    authenticatorEnabled: factors.some((factor) => factor.factor_type === "totp" && factor.status === "verified"),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function currentUserId(req) {
  return String(req.supabase?.user?.id || req.user?._id || req.user?.id || "");
}

async function getUser(userId) {
  return supabaseRequest(`/admin/users/${encodeURIComponent(userId)}`, { admin: true });
}

router.get("/", async (_req, res) => {
  try {
    const result = await listAdminUsers(1, 1000);
    const users = Array.isArray(result?.users) ? result.users : Array.isArray(result) ? result : [];
    return res.json(
      users
        .filter((user) => user.app_metadata?.role === "admin")
        .sort((a, b) => String(a.user_metadata?.name || a.email).localeCompare(String(b.user_metadata?.name || b.email)))
        .map(publicUser)
    );
  } catch (error) {
    console.error("Unable to list Supabase administrators:", error);
    return res.status(500).json({ message: "Unable to load administrator accounts" });
  }
});

router.post("/", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and temporary password are required" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }
    if (password.length < 12) {
      return res.status(400).json({ message: "Temporary password must be at least 12 characters" });
    }

    const user = await createAdminUser({ name, email, password });
    return res.status(201).json(publicUser(user));
  } catch (error) {
    console.error("Unable to create Supabase administrator:", error);
    return res.status(error.status === 422 ? 409 : 400).json({ message: error.message || "Unable to create administrator" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const user = await getUser(req.params.id);
    const isSelf = currentUserId(req) === String(user.id);
    const nextSuspended = Object.prototype.hasOwnProperty.call(req.body || {}, "suspended")
      ? Boolean(req.body.suspended)
      : isBanned(user);

    if (isSelf && nextSuspended) {
      return res.status(400).json({ message: "You cannot suspend the account currently in use" });
    }

    const name = String(req.body?.name ?? user.user_metadata?.name ?? user.email).trim();
    const email = String(req.body?.email ?? user.email).trim().toLowerCase();
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "A valid name and email are required" });
    }

    const updated = await updateSupabaseUser(user.id, {
      email,
      user_metadata: { ...(user.user_metadata || {}), name },
      app_metadata: { ...(user.app_metadata || {}), role: "admin" },
      ban_duration: nextSuspended ? "876000h" : "none",
    });
    return res.json(publicUser(updated));
  } catch (error) {
    console.error("Unable to update Supabase administrator:", error);
    return res.status(error.status || 400).json({ message: error.message || "Unable to update administrator" });
  }
});

router.post("/:id/reset-password", async (req, res) => {
  try {
    const password = String(req.body?.password || "");
    if (password.length < 12) {
      return res.status(400).json({ message: "Temporary password must be at least 12 characters" });
    }
    await updateSupabaseUser(req.params.id, { password });
    return res.json({ success: true, message: "Temporary Supabase password set." });
  } catch (error) {
    console.error("Unable to reset Supabase password:", error);
    return res.status(error.status || 400).json({ message: error.message || "Unable to reset password" });
  }
});

router.post("/:id/reset-mfa", async (req, res) => {
  try {
    if (currentUserId(req) === String(req.params.id)) {
      return res.status(400).json({ message: "You cannot reset MFA for the session currently in use" });
    }

    const result = await listUserFactors(req.params.id);
    const factors = Array.isArray(result?.factors) ? result.factors : Array.isArray(result) ? result : [];
    for (const factor of factors) {
      await deleteUserFactor(req.params.id, factor.id);
    }
    return res.json({ success: true, message: "Authenticator factors removed. The administrator must enrol again." });
  } catch (error) {
    console.error("Unable to reset Supabase MFA:", error);
    return res.status(error.status || 400).json({ message: error.message || "Unable to reset MFA" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (currentUserId(req) === String(req.params.id)) {
      return res.status(400).json({ message: "You cannot delete the account currently in use" });
    }

    const result = await listAdminUsers(1, 1000);
    const users = Array.isArray(result?.users) ? result.users : Array.isArray(result) ? result : [];
    const activeAdmins = users.filter((user) => user.app_metadata?.role === "admin" && !isBanned(user));
    if (activeAdmins.length <= 1) {
      return res.status(409).json({ message: "BundleBee must retain at least one active administrator" });
    }

    await deleteSupabaseUser(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    console.error("Unable to delete Supabase administrator:", error);
    return res.status(error.status || 400).json({ message: error.message || "Unable to delete administrator" });
  }
});

module.exports = router;
