const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    description: { type: String, default: "", trim: true },
    imageUrl: { type: String, default: "", trim: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    featured: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    seoTitle: { type: String, default: "", trim: true },
    seoDescription: { type: String, default: "", trim: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

collectionSchema.index({ active: 1, featured: -1, sortOrder: 1 });

module.exports = mongoose.model("Collection", collectionSchema);
