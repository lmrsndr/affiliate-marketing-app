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
    tagline: {
      type: String,
      default: "",
      trim: true,
      maxlength: 180,
    },
    story: {
      type: String,
      default: "",
      trim: true,
    },
    curatorNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    heroImageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    galleryImages: {
      type: [String],
      default: [],
    },
    affiliateUrl: {
      type: String,
      default: "",
      trim: true,
    },
    affiliateProgramme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AffiliateProgramme",
      default: null,
    },
    moods: { type: [String], default: [], index: true },
    recipients: { type: [String], default: [], index: true },
    occasions: { type: [String], default: [], index: true },
    qualities: { type: [String], default: [], index: true },
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
    featured: {
      type: Boolean,
      default: false,
      index: true,
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
    clicks: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

brandSchema.index({ name: 1 });
brandSchema.index({ active: 1, approved: 1 });
brandSchema.index({ active: 1, approved: 1, publishedAt: -1 });

module.exports = mongoose.model("Brand", brandSchema);
