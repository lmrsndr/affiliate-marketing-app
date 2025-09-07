const express = require("express");
const router = express.Router();
const requireVerified2FA = require("../middleware/requireVerified2FA");
const role = require("../middleware/roleMiddleware");
const partner = require("../controllers/partnerController");

// Verified and partner role
router.use(requireVerified2FA, role("partner"));

router.get ("/analytics",        partner.getPartnerAnalytics);
router.get ("/comments",         partner.getPartnerComments);
router.post("/reply",            partner.replyToComment);
router.post("/upload-ad",        partner.uploadAd);
router.get ("/export-analytics", partner.exportAnalyticsCSV);
router.get ("/subscription",     partner.getSubscription);
router.put ("/subscription",     partner.updateSubscription);
router.get ("/ad",               partner.getAd);

module.exports = router;
