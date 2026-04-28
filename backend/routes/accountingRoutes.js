const express = require("express");
const router = express.Router();
const multer = require("multer");

const requireVerified2FA = require("../middleware/requireVerified2FA");
const role = require("../middleware/roleMiddleware");
const accounting = require("../controllers/accountingController");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/health", requireVerified2FA, role("admin"), (_req, res) => res.json({ ok: true }));

// Admin accounting report and exports
router.get("/report", requireVerified2FA, role("admin"), accounting.getReport);
router.get("/export", requireVerified2FA, role("admin"), accounting.exportCSV);
router.get("/signed-url", requireVerified2FA, role("admin"), accounting.getSignedS3Url);

// Admin expense management
router.post("/expense", requireVerified2FA, role("admin"), upload.single("file"), accounting.uploadExpense);
router.put("/expense/:id", requireVerified2FA, role("admin"), accounting.updateExpense);
router.delete("/expense/:id", requireVerified2FA, role("admin"), accounting.deleteExpense);
router.put(
  "/expense/:id/reupload",
  requireVerified2FA,
  role("admin"),
  upload.single("file"),
  accounting.reuploadExpenseFile
);

// Admin invoice file maintenance
router.put(
  "/transaction/:id/reupload",
  requireVerified2FA,
  role("admin"),
  upload.single("file"),
  accounting.reuploadTransactionFile
);

// Partner invoice access; controller enforces partner ownership.
router.get("/my-invoices", requireVerified2FA, role("partner"), accounting.getPartnerInvoices);
router.get("/invoice/:txnId", requireVerified2FA, role(["admin", "partner"]), accounting.getInvoice);

module.exports = router;
