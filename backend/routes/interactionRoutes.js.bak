const express = require("express");
const router = express.Router();
const { logInteraction, exportInteractionsCSV } = require("../controllers/interactionController");

const authenticateToken = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ✅ Log interaction
router.post("/", logInteraction);

// ✅ Export interactions as CSV (Admin only)
router.get("/export", authenticateToken, roleMiddleware("admin"), exportInteractionsCSV);

module.exports = router;
