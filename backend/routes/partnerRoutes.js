const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const requireVerified2FA = require("../middleware/requireVerified2FA"); // ✅ Added

const partnerController = require("../controllers/partnerController");

// ✅ Protect all routes with auth + 2FA
const protect = [authMiddleware, requireVerified2FA];

// ✅ Get Analytics Data
router.get("/analytics", protect, partnerController.getPartnerAnalytics);

// ✅ Get Comments / Reviews
router.get("/comments", protect, partnerController.getPartnerComments);

// ✅ Reply to Comment
router.post("/reply", protect, partnerController.replyToComment);

// ✅ Upload Video or Image Ad
router.post("/upload-ad", protect, partnerController.uploadAd);

// ✅ Export Analytics CSV (Gold/Dynamic only)
router.get("/export-analytics", protect, partnerController.exportAnalyticsCSV);

// ✅ Get Current Subscription Tier
router.get("/subscription", protect, partnerController.getSubscription);

// ✅ Update Subscription Tier
router.put("/subscription", protect, partnerController.updateSubscription);

// ✅ (Optional) Ad Preview Placeholder
router.get("/ad", protect, partnerController.getAd);

module.exports = router;
