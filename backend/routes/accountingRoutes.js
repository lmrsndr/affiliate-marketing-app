const express = require("express");
const router = express.Router();
const multer = require("multer");

const controller = require("../controllers/accountingController");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const roleMiddleware = require("../middleware/roleMiddleware");
const requireVerified2FA = require("../middleware/requireVerified2FA"); // ✅ Added

// File upload setup using memoryStorage for S3 compatibility
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Combined middlewares for reuse
const protectAdmin = [requireVerified2FA, requireVerified2FA, roleMiddleware("admin")];
const protectShared = [requireVerified2FA, requireVerified2FA, roleMiddleware(["admin", "partner"])];

// ─────────────────────────────
// ✅ Admin-only accounting routes
// ─────────────────────────────
router.get("/report", protectAdmin, controller.getReport);
router.post("/transaction", protectAdmin, controller.addTransaction);
router.post("/expense", protectAdmin, upload.single("file"), controller.uploadExpense);
router.put("/expense/:id/reupload", protectAdmin, upload.single("file"), controller.reuploadExpenseFile);
router.get("/export", protectAdmin, controller.exportCSV);

// ─────────────────────────────
// ✅ Shared: invoice generation and file access (admin + partner)
// ─────────────────────────────
router.get("/invoice/:txnId", protectShared, controller.getInvoice);
router.get("/signed-url", protectShared, controller.getSignedS3Url);

module.exports = router;
