const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const Transaction = require("../models/Transaction");

/**
 * GET /api/partner/invoices
 * Get all invoices for the authenticated partner
 */
router.get("/invoices", authenticate, roleMiddleware("partner"), async (req, res) => {
  try {
    const invoices = await Transaction.find({
      partnerId: req.user._id,
      type: "subscription"
    }).sort({ date: -1 });

    res.json(invoices);
  } catch (err) {
    console.error("❌ Failed to fetch partner invoices:", err);
    res.status(500).json({ message: "Error fetching invoices" });
  }
});

module.exports = router;
