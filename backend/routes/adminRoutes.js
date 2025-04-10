const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authenticateToken = require("../middleware/authMiddleware");
const requireVerified2FA = require("../middleware/requireVerified2FA"); // ✅ NEW
const { Parser } = require("json2csv");

// ✅ Require authentication for all admin routes
router.use(authenticateToken);

// ✅ Require verified 2FA for all admin routes
router.use(requireVerified2FA); // ✅ NEW

// ✅ Admin-only middleware
const ensureAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access Denied: Admins only." });
  }
  next();
};

// ✅ Admin Analytics Endpoint
router.get("/analytics", ensureAdmin, async (req, res) => {
  try {
    // Sample data (in future, replace with DB-stats or usage logs)
    const pageViews = [
      { category: "Home", views: 250 },
      { category: "Dashboard", views: 180 },
      { category: "Results", views: 90 },
    ];

    const subscriptions = [
      { date: "2024-01-01", count: 5 },
      { date: "2024-01-02", count: 12 },
      { date: "2024-01-03", count: 7 },
    ];

    const affiliateClicks = [
      { partner: "Boxy Co", clicks: 50 },
      { partner: "Snackify", clicks: 75 },
      { partner: "EcoGoods", clicks: 30 },
    ];

    res.json({ pageViews, subscriptions, affiliateClicks });
  } catch (err) {
    console.error("❌ Failed to get analytics:", err);
    res.status(500).json({ message: "Analytics data could not be retrieved" });
  }
});

// ✅ Export Users to CSV
router.get("/export-users", ensureAdmin, async (req, res) => {
  try {
    const users = await User.find().lean();

    const fields = [
      { label: "Name", value: "name" },
      { label: "Email", value: "email" },
      { label: "Role", value: "role" },
      {
        label: "Joined",
        value: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : "N/A"),
      },
      { label: "Revenue", value: "revenue" },
      { label: "Referrals", value: "referrals" },
      { label: "Reviews", value: "reviews" },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(users);

    res.header("Content-Type", "text/csv");
    res.attachment("users.csv");
    res.send(csv);
  } catch (err) {
    console.error("❌ Failed to export users:", err);
    res.status(500).json({ message: "Failed to export user data" });
  }
});

module.exports = router;
