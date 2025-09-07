const express = require("express");
const router = express.Router();
const User = require("../models/User");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const { Parser } = require("json2csv");

let attachUserIfPresent = (_req,_res,next)=>next();
try { attachUserIfPresent = require("../middleware/attachUserIfPresent"); } catch {}

router.use(attachUserIfPresent);
router.use(requireVerified2FA);

const ensureAdmin = async (req, res, next) => {
  try {
    if (!req.user && req.auth?.claims?.id) {
      req.user = await User.findById(req.auth.claims.id);
    }
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

module.exports = router;
