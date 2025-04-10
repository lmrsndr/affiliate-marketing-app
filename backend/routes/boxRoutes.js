const express = require("express");
const router = express.Router();

const {
  getAllBoxes,
  getBoxById,
  createBox,
  updateBox,
  deleteBox,
} = require("../controllers/boxController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const scrapeWebsiteMetadata = require("../utils/scrapeWebsite");

// ✅ Public: Get all subscription boxes
router.get("/", getAllBoxes);

// ✅ Public: Limited data for public affiliate tiles (must come BEFORE `/:id`)
router.get("/public", async (req, res) => {
  try {
    const Box = require("../models/SubscriptionBox");
    const boxes = await Box.find({}, {
      name: 1,
      description: 1,
      affiliateLink: 1,
      imageUrl: 1
    });
    res.json(boxes);
  } catch (err) {
    console.error("❌ Failed to fetch public boxes:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Public: Get a single subscription box by ID
router.get("/:id", getBoxById);

// ✅ Admin-only: Create a subscription box
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  (req, res, next) => {
    if (!req.body.name || !req.body.category) {
      return res.status(400).json({ message: "Name and category are required" });
    }
    next();
  },
  createBox
);

// ✅ Admin-only: Update a subscription box
router.put("/:id", authMiddleware, roleMiddleware("admin"), updateBox);

// ✅ Admin-only: Delete a subscription box
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteBox);

// ✅ Admin-only: Auto-scrape metadata from partner’s website
router.post("/scrape", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { website } = req.body;

    if (!website) {
      return res.status(400).json({ message: "Website URL is required" });
    }

    const data = await scrapeWebsiteMetadata(website);
    res.json(data);
  } catch (err) {
    console.error("❌ Scraping error:", err);
    res.status(500).json({ message: "Failed to scrape website" });
  }
});

module.exports = router;
