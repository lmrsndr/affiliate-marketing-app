const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();
router.use(requireVerified2FA, roleMiddleware("admin"));

function publicUser(user) {
  return {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    suspended: Boolean(user.suspended),
    localEnabled: Boolean(user.localEnabled),
    googleEnabled: Boolean(user.googleId),
    email2FAEnabled: Boolean(user.email2FA?.enabled),
    authenticatorEnabled: Boolean(user.twoFA?.enabled),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function currentUserId(req) {
  return String(req.user?._id || req.user?.id || "");
}

router.get("/", async (_req, res) => {
  try {
    const users = await User.find({ role: "admin" }).sort({ name: 1, email: 1 });
    return res.json(users.map(publicUser));
  } catch (error) {
    console.error("Unable to list administrators:", error);
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
    if (await User.exists({ email })) {
      return res.status(409).json({ message: "An account with that email already exists" });
    }

    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: "admin",
      localEnabled: true,
      suspended: false,
      email2FA: { enabled: true, verified: false },
      twoFAVerified: false,
    });

    return res.status(201).json(publicUser(user));
  } catch (error) {
    console.error("Unable to create administrator:", error);
    return res.status(400).json({ message: error?.code === 11000 ? "An account with that email already exists" : "Unable to create administrator" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }

    const user = await User.findOne({ _id: req.params.id, role: "admin" });
    if (!user) return res.status(404).json({ message: "Administrator not found" });

    const isSelf = currentUserId(req) === String(user._id);
    const allowed = ["name", "email", "localEnabled", "suspended"];

    for (const key of allowed) {
      if (!Object.prototype.hasOwnProperty.call(req.body || {}, key)) continue;
      if (isSelf && (key === "localEnabled" || key === "suspended") && req.body[key] !== user[key]) {
        return res.status(400).json({ message: "You cannot disable or suspend the account currently in use" });
      }
      user[key] = key === "email" ? String(req.body[key]).trim().toLowerCase() : req.body[key];
    }

    if (!user.name?.trim() || !/^\S+@\S+\.\S+$/.test(user.email || "")) {
      return res.status(400).json({ message: "A valid name and email are required" });
    }

    await user.save();
    return res.json(publicUser(user));
  } catch (error) {
    console.error("Unable to update administrator:", error);
    return res.status(error?.code === 11000 ? 409 : 400).json({ message: error?.code === 11000 ? "An account with that email already exists" : "Unable to update administrator" });
  }
});

router.post("/:id/reset-password", async (req, res) => {
  try {
    const password = String(req.body?.password || "");
    if (password.length < 12) {
      return res.status(400).json({ message: "Temporary password must be at least 12 characters" });
    }

    const user = await User.findOne({ _id: req.params.id, role: "admin" }).select("+password");
    if (!user) return res.status(404).json({ message: "Administrator not found" });

    user.password = await bcrypt.hash(password, 12);
    user.localEnabled = true;
    user.email2FA.enabled = true;
    user.email2FA.verified = false;
    user.twoFAVerified = false;
    await user.save();

    return res.json({ success: true, message: "Temporary password set. The administrator must complete email 2FA on the next login." });
  } catch (error) {
    console.error("Unable to reset administrator password:", error);
    return res.status(400).json({ message: "Unable to reset password" });
  }
});

router.post("/:id/reset-mfa", async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: "admin" });
    if (!user) return res.status(404).json({ message: "Administrator not found" });

    user.twoFA.enabled = false;
    user.twoFA.secret = undefined;
    user.twoFA.backupCodes = [];
    user.email2FA.enabled = true;
    user.email2FA.verified = false;
    user.email2FA.code = undefined;
    user.email2FA.expiresAt = undefined;
    user.twoFAVerified = false;
    await user.save();

    return res.json({ success: true, message: "MFA reset. Email verification will be required at the next login." });
  } catch (error) {
    console.error("Unable to reset administrator MFA:", error);
    return res.status(400).json({ message: "Unable to reset MFA" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (currentUserId(req) === String(req.params.id)) {
      return res.status(400).json({ message: "You cannot delete the account currently in use" });
    }

    const activeAdmins = await User.countDocuments({ role: "admin", suspended: { $ne: true } });
    if (activeAdmins <= 1) {
      return res.status(409).json({ message: "BundleBee must retain at least one active administrator" });
    }

    const deleted = await User.findOneAndDelete({ _id: req.params.id, role: "admin" });
    if (!deleted) return res.status(404).json({ message: "Administrator not found" });
    return res.json({ success: true });
  } catch (error) {
    console.error("Unable to delete administrator:", error);
    return res.status(400).json({ message: "Unable to delete administrator" });
  }
});

module.exports = router;
