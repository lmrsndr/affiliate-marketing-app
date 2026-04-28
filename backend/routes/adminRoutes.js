const express = require("express");
const router = express.Router();
const User = require("../models/User");
const SubscriptionBox = require("../models/SubscriptionBox");
const Interaction = require("../models/Interaction");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const { Parser } = require("json2csv");

let attachUserIfPresent = (_req,_res,next)=>next();
try { attachUserIfPresent = require("../middleware/attachUserIfPresent"); } catch {}

router.use(attachUserIfPresent);
router.use(requireVerified2FA);

const ensureAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Access Denied: Admins only." });
    }
    next();
  } catch (err) {
    console.error("ensureAdmin error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

router.get("/analytics", ensureAdmin, async (_req, res) => {
  res.json({
    pageViews:     [{ category:"Home", views:250 }, { category:"Dashboard", views:180 }, { category:"Results", views:90 }],
    subscriptions: [{ date:"2024-01-01", count:5 }, { date:"2024-01-02", count:12 }, { date:"2024-01-03", count:7 }],
    affiliateClicks:[{ partner:"Boxy Co", clicks:50 }, { partner:"Snackify", clicks:75 }, { partner:"EcoGoods", clicks:30 }]
  });
});

router.get("/affiliates", ensureAdmin, async (_req, res) => {
  try {
    const items = await SubscriptionBox.find().populate("category", "name").lean();
    res.json({ items });
  } catch (err) {
    console.error("admin affiliates error:", err);
    res.status(500).json({ message: "Failed to load affiliates" });
  }
});

router.get("/export-users", ensureAdmin, async (_req, res) => {
  const users = await User.find().lean();
  const parser = new (require("json2csv").Parser)({
    fields: [
      { label:"Name", value:"name" },
      { label:"Email", value:"email" },
      { label:"Role", value:"role" },
      { label:"Joined", value:(r)=> (r.createdAt ? new Date(r.createdAt).toLocaleString() : "N/A") },
      { label:"Revenue", value:"revenue" },
      { label:"Referrals", value:"referrals" },
      { label:"Reviews", value:"reviews" },
    ]
  });
  res.header("Content-Type","text/csv").attachment("users.csv").send(parser.parse(users));
});

router.get("/export-analytics", ensureAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query || {};
    const filter = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const interactions = await Interaction.find(filter).lean();
    const parser = new Parser({
      fields: ["action", "timestamp", "userId", "details"],
    });
    const rows = interactions.map((item) => ({
      action: item.action,
      timestamp: item.timestamp,
      userId: item.userId || "",
      details: JSON.stringify(item.details || {}),
    }));

    res.header("Content-Type", "text/csv").attachment("analytics.csv").send(parser.parse(rows));
  } catch (err) {
    console.error("export analytics error:", err);
    res.status(500).json({ message: "Failed to export analytics" });
  }
});

router.patch("/permissions/users/:id", ensureAdmin, async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!["user", "admin", "partner"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("permission user update error:", err);
    res.status(500).json({ message: "Failed to update user role" });
  }
});

module.exports = router;
