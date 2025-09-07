const express = require("express");
const router = express.Router();
const SubscriptionBox = require("../models/SubscriptionBox");
const requireVerified2FA = require("../middleware/requireVerified2FA");

// ✅ Get Top Categories Based on Popularity (Authenticated Users Only)
router.get("/top-categories", requireVerified2FA, async (req, res) => {
  try {
    const topCategories = await SubscriptionBox.aggregate([
      {
        $group: {
          _id: "$category",
          avgRating: { $avg: "$ratings" },
          totalClicks: { $sum: "$clicks" }
        }
      },
      { $sort: { avgRating: -1, totalClicks: -1 } },
      { $limit: 6 }
    ]);

    res.json({ success: true, categories: topCategories });
  } catch (error) {
    console.error("❌ Error fetching top categories:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
