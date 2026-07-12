const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    website: {
      type: String,
      required: true,
      trim: true,
    },
    logoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    country: {
      type: String,
      default: "United Kingdom",
      trim: true,
    },
    independent: {
      type: Boolean,
      default: false,
    },
    smallBusiness: {
      type: Boolean,
      default: false,
    },
    approved: {
      type: Boolean,
      default: false,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    contactName: {
      type: String,
      default: "",
      trim: true,
    },
    contactEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    internalNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

brandSchema.index({ name: 1 });
brandSchema.index({ active: 1, approved: 1 });

module.exports = mongoose.model("Brand", brandSchema);
