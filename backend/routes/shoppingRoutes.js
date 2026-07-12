const express = require("express");
const mongoose = require("mongoose");

const Product = require("../models/Product");
const Brand = require("../models/Brand");
const Collection = require("../models/Collection");
const AffiliateProgramme = require("../models/AffiliateProgramme");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  cleanStringList,
  isSafePublicUrl,
  normaliseSlug,
  validateShoppingPayload,
} = require("../utils/validation");

const router = express.Router();
const adminOnly = [requireVerified2FA, roleMiddleware("admin")];

function safeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseBoolean(value) {
  if (value === undefined) return undefined;
  return String(value).toLowerCase() === "true";
}

function preparePayload(kind, body) {
  const payload = { ...body };
  if (payload.slug !== undefined) payload.slug = normaliseSlug(payload.slug);
  if (kind === "product") {
    payload.tags = cleanStringList(payload.tags);
    payload.badges = cleanStringList(payload.badges);
    payload.additionalImages = cleanStringList(payload.additionalImages).filter((url) => isSafePublicUrl(url));
  }
  if (kind === "collection") payload.products = cleanStringList(payload.products);
  return payload;
}

function validate(kind) {
  return (req, res, next) => {
    req.body = preparePayload(kind, req.body || {});
    const errors = validateShoppingPayload(kind, req.body);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    next();
  };
}

function sendAdminError(res, error) {
  if (error?.code === 11000) return res.status(409).json({ message: "A record with that name or slug already exists" });
  return res.status(400).json({ message: error.message || "Invalid request" });
}

router.get("/products", async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 100);
    const query = { active: true, publishedAt: { $ne: null } };

    if (req.query.brand && mongoose.isValidObjectId(req.query.brand)) query.brand = req.query.brand;
    if (req.query.category && mongoose.isValidObjectId(req.query.category)) query.categories = req.query.category;
    if (req.query.type) query.productType = req.query.type;
    if (req.query.featured !== undefined) query.featured = parseBoolean(req.query.featured);
    if (req.query.q) {
      const search = new RegExp(safeRegex(req.query.q), "i");
      query.$or = [
        { name: search },
        { shortDescription: search },
        { description: search },
        { tags: search },
      ];
    }

    const sortOptions = {
      newest: { publishedAt: -1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      popular: { clicks: -1 },
    };

    const [items, total] = await Promise.all([
      Product.find(query)
        .populate("brand", "name slug website logoUrl description country independent smallBusiness")
        .populate("categories", "name description imageUrl")
        .sort(sortOptions[req.query.sort] || { featured: -1, publishedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Failed to list products:", error);
    res.status(500).json({ message: "Unable to load products" });
  }
});

router.get("/products/:slug", async (req, res) => {
  try {
    const item = await Product.findOne({
      slug: normaliseSlug(req.params.slug),
      active: true,
      publishedAt: { $ne: null },
    })
      .populate("brand", "name slug website logoUrl description country independent smallBusiness")
      .populate("categories", "name description imageUrl");

    if (!item) return res.status(404).json({ message: "Product not found" });
    res.json(item);
  } catch (error) {
    console.error("Failed to load product:", error);
    res.status(500).json({ message: "Unable to load product" });
  }
});

router.post("/products/:id/click", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, active: true, publishedAt: { $ne: null } },
      { $inc: { clicks: 1 } },
      { new: true }
    ).select("affiliateUrl");

    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!isSafePublicUrl(product.affiliateUrl, { required: true })) {
      return res.status(409).json({ message: "This retailer link needs administrator review" });
    }
    res.json({ url: product.affiliateUrl });
  } catch (error) {
    console.error("Failed to record product click:", error);
    res.status(500).json({ message: "Unable to open retailer" });
  }
});

router.get("/brands", async (_req, res) => {
  try {
    res.json(
      await Brand.find({ active: true, approved: true })
        .select("name slug website logoUrl description country independent smallBusiness")
        .sort({ name: 1 })
    );
  } catch (error) {
    console.error("Failed to list brands:", error);
    res.status(500).json({ message: "Unable to load brands" });
  }
});

router.get("/brands/:slug", async (req, res) => {
  try {
    const brand = await Brand.findOne({
      slug: normaliseSlug(req.params.slug),
      active: true,
      approved: true,
    }).select("name slug website logoUrl description country independent smallBusiness");
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    const products = await Product.find({ brand: brand._id, active: true, publishedAt: { $ne: null } })
      .populate("categories", "name description imageUrl")
      .sort({ featured: -1, publishedAt: -1 });

    res.json({ brand, products });
  } catch (error) {
    console.error("Failed to load brand:", error);
    res.status(500).json({ message: "Unable to load brand" });
  }
});

router.get("/collections", async (_req, res) => {
  try {
    res.json(
      await Collection.find({ active: true, publishedAt: { $ne: null } })
        .select("name slug description imageUrl featured sortOrder seoTitle seoDescription publishedAt")
        .sort({ featured: -1, sortOrder: 1, publishedAt: -1 })
    );
  } catch (error) {
    console.error("Failed to list collections:", error);
    res.status(500).json({ message: "Unable to load collections" });
  }
});

router.get("/collections/:slug", async (req, res) => {
  try {
    const collection = await Collection.findOne({
      slug: normaliseSlug(req.params.slug),
      active: true,
      publishedAt: { $ne: null },
    }).populate({
      path: "products",
      match: { active: true, publishedAt: { $ne: null } },
      populate: [
        { path: "brand", select: "name slug website logoUrl independent smallBusiness" },
        { path: "categories", select: "name description imageUrl" },
      ],
    });

    if (!collection) return res.status(404).json({ message: "Collection not found" });
    res.json(collection);
  } catch (error) {
    console.error("Failed to load collection:", error);
    res.status(500).json({ message: "Unable to load collection" });
  }
});

router.get("/admin/products", ...adminOnly, async (_req, res) => {
  res.json(
    await Product.find()
      .select("+commissionType +commissionValue +cookieDurationDays +adminNotes")
      .populate("brand", "name slug")
      .populate("categories", "name")
      .populate("affiliateProgramme", "name network status")
      .sort({ updatedAt: -1 })
  );
});

router.post("/admin/products", ...adminOnly, validate("product"), async (req, res) => {
  try {
    res.status(201).json(await Product.create(req.body));
  } catch (error) {
    sendAdminError(res, error);
  }
});

router.put("/admin/products/:id", ...adminOnly, validate("product"), async (req, res) => {
  try {
    const item = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .select("+commissionType +commissionValue +cookieDurationDays +adminNotes");
    if (!item) return res.status(404).json({ message: "Product not found" });
    res.json(item);
  } catch (error) {
    sendAdminError(res, error);
  }
});

router.delete("/admin/products/:id", ...adminOnly, async (req, res) => {
  const item = await Product.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!item) return res.status(404).json({ message: "Product not found" });
  res.json({ success: true });
});

router.get("/admin/brands", ...adminOnly, async (_req, res) => {
  res.json(await Brand.find().sort({ updatedAt: -1 }));
});
router.post("/admin/brands", ...adminOnly, validate("brand"), async (req, res) => {
  try { res.status(201).json(await Brand.create(req.body)); } catch (error) { sendAdminError(res, error); }
});
router.put("/admin/brands/:id", ...adminOnly, validate("brand"), async (req, res) => {
  try {
    const item = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Brand not found" });
    res.json(item);
  } catch (error) { sendAdminError(res, error); }
});

router.get("/admin/collections", ...adminOnly, async (_req, res) => {
  res.json(await Collection.find().populate("products", "name slug active").sort({ updatedAt: -1 }));
});
router.post("/admin/collections", ...adminOnly, validate("collection"), async (req, res) => {
  try { res.status(201).json(await Collection.create(req.body)); } catch (error) { sendAdminError(res, error); }
});
router.put("/admin/collections/:id", ...adminOnly, validate("collection"), async (req, res) => {
  try {
    const item = await Collection.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Collection not found" });
    res.json(item);
  } catch (error) { sendAdminError(res, error); }
});

router.get("/admin/affiliate-programmes", ...adminOnly, async (_req, res) => {
  res.json(await AffiliateProgramme.find().sort({ updatedAt: -1 }));
});
router.post("/admin/affiliate-programmes", ...adminOnly, validate("programme"), async (req, res) => {
  try { res.status(201).json(await AffiliateProgramme.create(req.body)); } catch (error) { sendAdminError(res, error); }
});
router.put("/admin/affiliate-programmes/:id", ...adminOnly, validate("programme"), async (req, res) => {
  try {
    const item = await AffiliateProgramme.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: "Affiliate programme not found" });
    res.json(item);
  } catch (error) { sendAdminError(res, error); }
});

module.exports = router;
