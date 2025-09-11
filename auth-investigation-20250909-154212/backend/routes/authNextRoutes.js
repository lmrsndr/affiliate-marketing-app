// routes/authNextRoutes.js
const express = require("express");
const router = express.Router();
const attachUserIfPresent = require("../middleware/attachUserIfPresent");
const { getNext } = require("../controllers/authNextController");

// Best-effort user attach; no blocking
router.get("/next", attachUserIfPresent, getNext);

module.exports = router;
