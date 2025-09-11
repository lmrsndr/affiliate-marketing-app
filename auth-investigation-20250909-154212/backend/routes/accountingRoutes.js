const express = require("express");
const router = express.Router();

const requireVerified2FA = require("../middleware/requireVerified2FA");
const role = require("../middleware/roleMiddleware");

// ✅ All accounting routes require MFA and admin role
router.use(requireVerified2FA, role("admin"));

/**
 * If you had previous endpoints, re-add them below.
 * Keeping a basic health endpoint so the router is non-empty.
 */
router.get("/health", (_req, res) => res.json({ ok: true }));

module.exports = router;
