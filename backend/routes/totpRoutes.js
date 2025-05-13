// routes/totpRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const totpController = require("../controllers/totpController");

router.get("/setup", authMiddleware, totpController.generateTOTPSecret);
router.post("/verify", authMiddleware, totpController.verifyTOTP);

module.exports = router;
