const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    shortDescription: { type: String, required: true, trim: true, maxlength: 240 },
    description: { type: String, default: "", trim: true },
    curatorNote: { type: String, default: "", trim: true, maxlength: 320 },
    price: { type: Number, default: null, min: 0 },
    currency: { type: String, default: "GBP", trim: true, uppercase: true },
    productUrl: { type: String, required: true, trim: true },
    affiliateUrl: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    additionalImages: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    moods: { type: [String], default: [], index: true },
    recipients: { type: [String], default: [], index: true },
    occasions: { type: [String], default: [], index: true },
    qualities: { type: [String], default: [], index: true },
    productType: {
      type: String,
      enum: ["physical", "digital", "subscription", "experience", "service"],
      default: "physical",
    },
    badges: { type: [String], default: [] },
    featured: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
    stockStatus: {
      type: String,
      enum: ["unknown", "in_stock", "out_of_stock"],
      default: "unknown",
    },
    priceCheckedAt: { type: Date, default: null },
    affiliateProgramme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AffiliateProgramme",
      default: null,
    },
    commissionType: {
      type: String,
      enum: ["percentage", "fixed", "unknown"],
      default: "unknown",
      select: false,
    },
    commissionValue: { type: Number, default: null, select: false },
    cookieDurationDays: { type: Number, default: null, select: false },
    adminNotes: { type: String, default: "", select: false },
    clicks: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", shortDescription: "text", description: "text", curatorNote: "text", tags: "text", moods: "text", recipients: "text", occasions: "text", qualities: "text" });
productSchema.index({ active: 1, publishedAt: -1 });
productSchema.index({ categories: 1, active: 1 });

module.exports = mongoose.model("Product", productSchema);
