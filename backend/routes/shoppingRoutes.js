const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");

const Product = require("../models/Product");
const Brand = require("../models/Brand");
const Collection = require("../models/Collection");
const AffiliateProgramme = require("../models/AffiliateProgramme");
const requireVerified2FA = require("../middleware/requireVerified2FA");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  normaliseProgrammeName,
  parseAwinCsv,
  prepareAwinProgramme,
} = require("../utils/awinAdvertiserImport");
const {
  cleanStringList,
  isSafePublicUrl,
  normaliseSlug,
  validateShoppingPayload,
} = require("../utils/validation");
const {
  canPreviewProgramme,
  createPreviewToken,
  isPreviewToken,
} = require("../utils/partnerPreview");

const router = express.Router();
const adminOnly = [requireVerified2FA, roleMiddleware("admin")];
const awinCsvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const csvFile = file.originalname.toLowerCase().endsWith(".csv") || file.mimetype === "text/csv";
    callback(csvFile ? null : new Error("Please upload an Awin CSV export"), csvFile);
  },
}).single("file");

async function ensurePreviewTokens() {
  const missing = await AffiliateProgramme.find({
    active: { $ne: false },
    status: "applied",
    reviewDecision: { $ne: "rejected" },
    $or: [{ previewToken: { $exists: false } }, { previewToken: "" }],
  }).select("+previewToken");

  await Promise.all(missing.map((programme) => {
    programme.previewToken = createPreviewToken();
    return programme.save();
  }));
}

function receiveAwinCsv(req, res, next) {
  awinCsvUpload(req, res, (error) => {
    if (error) return res.status(400).json({ message: error.message || "Unable to read the CSV" });
    next();
  });
}

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
  if (kind === "product" || kind === "brand") {
    payload.moods = cleanStringList(payload.moods);
    payload.recipients = cleanStringList(payload.recipients);
    payload.occasions = cleanStringList(payload.occasions);
    payload.qualities = cleanStringList(payload.qualities);
  }
  if (kind === "brand") {
    payload.galleryImages = cleanStringList(payload.galleryImages).filter((url) => isSafePublicUrl(url));
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
    const publicBrandIds = await Brand.find({
      active: true,
      approved: true,
      publishedAt: { $ne: null },
    }).distinct("_id");
    const query = {
      active: true,
      publishedAt: { $ne: null },
      brand: { $in: publicBrandIds },
    };

    if (req.query.brand && mongoose.isValidObjectId(req.query.brand)) {
      query.brand = publicBrandIds.some((id) => String(id) === String(req.query.brand))
        ? req.query.brand
        : { $in: [] };
    }
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
        .populate("brand", "name slug website logoUrl description tagline curatorNote heroImageUrl affiliateUrl country independent smallBusiness featured moods recipients occasions qualities")
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
      .populate({
        path: "brand",
        match: { active: true, approved: true, publishedAt: { $ne: null } },
        select: "name slug website logoUrl description tagline curatorNote heroImageUrl affiliateUrl country independent smallBusiness featured moods recipients occasions qualities",
      })
      .populate("categories", "name description imageUrl");

    if (!item || !item.brand) return res.status(404).json({ message: "Product not found" });
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

    const publicBrandIds = await Brand.find({
      active: true,
      approved: true,
      publishedAt: { $ne: null },
    }).distinct("_id");

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        brand: { $in: publicBrandIds },
        active: true,
        publishedAt: { $ne: null },
      },
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
      await Brand.find({ active: true, approved: true, publishedAt: { $ne: null } })
        .select("name slug website logoUrl description tagline curatorNote heroImageUrl galleryImages affiliateUrl country independent smallBusiness featured moods recipients occasions qualities clicks publishedAt")
        .sort({ featured: -1, name: 1 })
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
      publishedAt: { $ne: null },
    }).select("name slug website logoUrl description tagline story curatorNote heroImageUrl galleryImages affiliateUrl country independent smallBusiness featured moods recipients occasions qualities clicks publishedAt");
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    const products = await Product.find({ brand: brand._id, active: true, publishedAt: { $ne: null } })
      .populate("categories", "name description imageUrl")
      .sort({ featured: -1, brandSortOrder: 1, publishedAt: -1 });

    res.json({ brand, products });
  } catch (error) {
    console.error("Failed to load brand:", error);
    res.status(500).json({ message: "Unable to load brand" });
  }
});

router.post("/brands/:id/click", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid maker ID" });
    }

    const brand = await Brand.findOneAndUpdate(
      { _id: req.params.id, active: true, approved: true, publishedAt: { $ne: null } },
      { $inc: { clicks: 1 } },
      { new: true }
    ).select("affiliateUrl website");

    if (!brand) return res.status(404).json({ message: "Maker not found" });
    const url = isSafePublicUrl(brand.affiliateUrl) ? brand.affiliateUrl : brand.website;
    if (!isSafePublicUrl(url, { required: true })) {
      return res.status(409).json({ message: "This shop link needs administrator review" });
    }
    res.json({ url });
  } catch (error) {
    console.error("Failed to record maker click:", error);
    res.status(500).json({ message: "Unable to open maker shop" });
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

router.get("/partner-previews/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim().toLowerCase();
    if (!isPreviewToken(token)) {
      return res.status(404).json({ message: "Concept preview not found" });
    }

    const programme = await AffiliateProgramme.findOne({
      previewToken: token,
      active: { $ne: false },
      status: "applied",
      reviewDecision: { $ne: "rejected" },
    }).select("name network suggestedFit fitReasons awin.descriptionShort awin.primarySector awin.parentSectors awin.subSectors");

    if (!programme) return res.status(404).json({ message: "Concept preview not found" });

    res.set("Cache-Control", "private, no-store, max-age=0");
    res.json({
      name: programme.name,
      network: programme.network,
      suggestedFit: programme.suggestedFit,
      fitReasons: programme.fitReasons || [],
      description: programme.awin?.descriptionShort || "",
      sector: programme.awin?.primarySector || "",
      sectors: [
        ...(programme.awin?.parentSectors || []),
        ...(programme.awin?.subSectors || []),
      ],
    });
  } catch (error) {
    console.error("Failed to load partner concept preview:", error);
    res.status(500).json({ message: "Unable to load concept preview" });
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
  await ensurePreviewTokens();
  res.json(await AffiliateProgramme.find().select("+previewToken").sort({ updatedAt: -1 }));
});
router.post("/admin/affiliate-programmes/import/awin", ...adminOnly, receiveAwinCsv, async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ message: "Choose an Awin CSV export to import" });

    const region = String(req.body.region || "GB").trim().toUpperCase();
    const publisherId = String(req.body.publisherId || "").trim();
    if (publisherId && !/^\d+$/.test(publisherId)) {
      return res.status(400).json({ message: "Awin publisher ID must contain numbers only" });
    }

    const rows = await parseAwinCsv(req.file.buffer.toString("utf8"));
    const existing = await AffiliateProgramme.find({
      $or: [
        { network: /^awin$/i },
        { "awin.advertiserId": { $exists: true } },
      ],
    });
    const byAdvertiserId = new Map();
    const byName = new Map();
    for (const item of existing) {
      if (item.awin?.advertiserId) byAdvertiserId.set(String(item.awin.advertiserId), item);
      byName.set(normaliseProgrammeName(item.name), item);
    }

    const now = new Date();
    const operations = [];
    const seenIds = new Set();
    const suggestedFits = { strong: 0, possible: 0, weak: 0, excluded: 0 };
    let matchedRegion = 0;
    let inserted = 0;
    let updated = 0;
    let invalid = 0;
    let duplicateRows = 0;

    for (const row of rows) {
      const prepared = prepareAwinProgramme(row, { publisherId, importedAt: now });
      if (!prepared) {
        invalid += 1;
        continue;
      }
      if (region && prepared.awin.primaryRegion !== region) continue;
      matchedRegion += 1;
      if (seenIds.has(prepared.awin.advertiserId)) {
        duplicateRows += 1;
        continue;
      }
      seenIds.add(prepared.awin.advertiserId);
      suggestedFits[prepared.suggestedFit] += 1;

      const match = byAdvertiserId.get(prepared.awin.advertiserId)
        || byName.get(normaliseProgrammeName(prepared.name));
      const importedFields = {
        source: prepared.source,
        applicationUrl: prepared.applicationUrl,
        commissionType: prepared.commissionType,
        commissionValue: prepared.commissionValue,
        cookieDurationDays: prepared.cookieDurationDays,
        suggestedFit: prepared.suggestedFit,
        prospectScore: prepared.prospectScore,
        fitReasons: prepared.fitReasons,
        riskFlags: prepared.riskFlags,
        awin: prepared.awin,
      };

      if (match) {
        updated += 1;
        operations.push({
          updateOne: {
            filter: { _id: match._id },
            update: { $set: importedFields },
          },
        });
      } else {
        inserted += 1;
        operations.push({
          insertOne: {
            document: {
              ...prepared,
              reviewDecision: "unreviewed",
              active: true,
            },
          },
        });
      }
    }

    if (operations.length) await AffiliateProgramme.bulkWrite(operations, { ordered: false });

    res.status(201).json({
      sourceRows: rows.length,
      region: region || "All",
      matchedRegion,
      imported: operations.length,
      inserted,
      updated,
      invalid,
      duplicateRows,
      suggestedFits,
    });
  } catch (error) {
    console.error("Failed to import Awin advertiser directory:", error);
    sendAdminError(res, error);
  }
});
router.post("/admin/affiliate-programmes", ...adminOnly, validate("programme"), async (req, res) => {
  try {
    const payload = { ...req.body };
    if (canPreviewProgramme(payload)) payload.previewToken = createPreviewToken();
    const item = await AffiliateProgramme.create(payload);
    res.status(201).json(await AffiliateProgramme.findById(item._id).select("+previewToken"));
  } catch (error) { sendAdminError(res, error); }
});
router.patch("/admin/affiliate-programmes/:id/review", ...adminOnly, async (req, res) => {
  try {
    const allowed = new Set(["unreviewed", "shortlisted", "maybe", "rejected"]);
    const reviewDecision = String(req.body.reviewDecision || "");
    if (!allowed.has(reviewDecision)) return res.status(400).json({ message: "Invalid review decision" });
    const item = await AffiliateProgramme.findByIdAndUpdate(
      req.params.id,
      { reviewDecision, reviewedAt: reviewDecision === "unreviewed" ? null : new Date() },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Affiliate programme not found" });
    res.json(item);
  } catch (error) {
    sendAdminError(res, error);
  }
});
router.put("/admin/affiliate-programmes/:id", ...adminOnly, validate("programme"), async (req, res) => {
  try {
    const existing = await AffiliateProgramme.findById(req.params.id).select("+previewToken");
    if (!existing) return res.status(404).json({ message: "Affiliate programme not found" });
    const payload = { ...req.body };
    if (canPreviewProgramme(payload) && !existing.previewToken) payload.previewToken = createPreviewToken();
    const item = await AffiliateProgramme.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true }).select("+previewToken");
    if (!item) return res.status(404).json({ message: "Affiliate programme not found" });
    res.json(item);
  } catch (error) { sendAdminError(res, error); }
});

module.exports = router;
