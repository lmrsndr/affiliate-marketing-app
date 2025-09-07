// backend/routes/authNextRoutes.js
const express = require("express");
const router = express.Router();
const { getNext } = require("../controllers/authNextController");

// If you have a "deserialize user" or "optional auth" middleware, use it here.
// Example:
// const { attachUserIfPresent } = require("../middleware/auth");
// router.get("/next", attachUserIfPresent, getNext);

router.get("/next", getNext);

module.exports = router;
