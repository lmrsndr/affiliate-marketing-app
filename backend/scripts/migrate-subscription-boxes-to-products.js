require("dotenv").config();

const mongoose = require("mongoose");
const SubscriptionBox = require("../models/SubscriptionBox");
const Brand = require("../models/Brand");
const Product = require("../models/Product");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parsePrice(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function hostnameFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function brandNameFromBox(box) {
  const host = hostnameFromUrl(box.website || box.affiliateLink);
  if (host) {
    const firstPart = host.split(".")[0];
    return firstPart
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return `${box.name} Brand`;
}

async function uniqueSlug(Model, baseValue, existingId = null) {
  const base = slugify(baseValue) || "item";
  let candidate = base;
  let counter = 2;

  while (await Model.exists({ slug: candidate, ...(existingId ? { _id: { $ne: existingId } } : {}) })) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function migrate() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const boxes = await SubscriptionBox.find().populate("category", "name");
  let createdProducts = 0;
  let skippedProducts = 0;
  let createdBrands = 0;

  for (const box of boxes) {
    const existing = await Product.findOne({
      $or: [
        { affiliateUrl: box.affiliateLink },
        { productUrl: box.website, name: box.name },
      ],
    });

    if (existing) {
      skippedProducts += 1;
      continue;
    }

    const brandName = brandNameFromBox(box);
    const website = box.website || box.affiliateLink;
    const brandSlugBase = slugify(brandName);

    let brand = await Brand.findOne({
      $or: [
        { slug: brandSlugBase },
        { website },
      ],
    });

    if (!brand) {
      brand = await Brand.create({
        name: brandName,
        slug: await uniqueSlug(Brand, brandName),
        website,
        description: `Products from ${brandName}.`,
        approved: false,
        active: true,
        internalNotes: "Created automatically from a legacy SubscriptionBox record. Review before approval.",
      });
      createdBrands += 1;
    }

    const categoryId = box.category?._id || box.category || null;
    const product = await Product.create({
      name: box.name,
      slug: await uniqueSlug(Product, box.name),
      brand: brand._id,
      categories: categoryId ? [categoryId] : [],
      shortDescription: String(box.description || box.name).slice(0, 240),
      description: box.description || "",
      price: parsePrice(box.price),
      currency: "GBP",
      productUrl: box.website || box.affiliateLink,
      affiliateUrl: box.affiliateLink,
      imageUrl: box.imageUrl || "/icon-512x512.png",
      productType: "subscription",
      tags: ["legacy-subscription"],
      featured: false,
      active: true,
      stockStatus: "unknown",
      clicks: Number(box.clicks || 0),
      publishedAt: new Date(),
      adminNotes: `Migrated from SubscriptionBox ${box._id}. Review brand, description, price and links.`,
    });

    console.log(`Created product: ${product.name}`);
    createdProducts += 1;
  }

  console.log(
    JSON.stringify(
      {
        legacyBoxes: boxes.length,
        createdBrands,
        createdProducts,
        skippedProducts,
      },
      null,
      2
    )
  );
}

migrate()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
