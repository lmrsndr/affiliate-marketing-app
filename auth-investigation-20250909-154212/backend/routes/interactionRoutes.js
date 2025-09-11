const express = require("express");
const router = express.Router();
const { logInteraction, exportInteractionsCSV } = require("../controllers/interactionController");

const requireVerified2FA = require("../middleware/requireVerified2FA");
const roleMiddleware = require("../middleware/roleMiddleware");

// ✅ Log interaction
router.post("/", logInteraction);

// ✅ Export interactions as CSV (Admin only)
router.get("/export", requireVerified2FA, roleMiddleware("admin"), exportInteractionsCSV);

module.exports = router;
