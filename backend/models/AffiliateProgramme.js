const mongoose = require("mongoose");

const awinDirectorySchema = new mongoose.Schema(
  {
    advertiserId: { type: String, trim: true },
    conversionRate: { type: Number, default: null },
    approvalRate: { type: Number, default: null },
    epc: { type: Number, default: null },
    launchDate: { type: Date, default: null },
    paymentStatus: { type: String, default: "unknown", trim: true, lowercase: true },
    paymentRiskLevel: { type: String, default: "unknown", trim: true, lowercase: true },
    awinIndex: { type: Number, default: null },
    feedEnabled: { type: Boolean, default: false },
    productReporting: { type: Boolean, default: false },
    commissionMin: { type: Number, default: null },
    commissionMax: { type: Number, default: null },
    leadMin: { type: Number, default: null },
    leadMax: { type: Number, default: null },
    cookieLengthDays: { type: Number, default: null },
    parentSectors: { type: [String], default: [] },
    subSectors: { type: [String], default: [] },
    primarySector: { type: String, default: "", trim: true },
    averagePaymentTimeDays: { type: Number, default: null },
    primaryRegion: { type: String, default: "", trim: true, uppercase: true },
    descriptionShort: { type: String, default: "", trim: true },
    logoUrl: { type: String, default: "", trim: true },
    displayUrl: { type: String, default: "", trim: true },
    importedAt: { type: Date, default: null },
  },
  { _id: false }
);

const affiliateProgrammeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    network: { type: String, default: "Direct", trim: true },
    applicationUrl: { type: String, default: "", trim: true },
    dashboardUrl: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["researching", "applied", "approved", "declined", "paused", "closed"],
      default: "researching",
      index: true,
    },
    commissionType: {
      type: String,
      enum: ["percentage", "fixed", "mixed", "unknown"],
      default: "unknown",
    },
    commissionValue: { type: Number, default: null },
    cookieDurationDays: { type: Number, default: null },
    paymentThreshold: { type: Number, default: null },
    contactEmail: { type: String, default: "", trim: true, lowercase: true },
    termsUrl: { type: String, default: "", trim: true },
    source: {
      type: String,
      enum: ["manual", "awin-directory"],
      default: "manual",
      index: true,
    },
    suggestedFit: {
      type: String,
      enum: ["unscored", "strong", "possible", "weak", "excluded"],
      default: "unscored",
      index: true,
    },
    prospectScore: { type: Number, default: null, min: 0, max: 100, index: true },
    fitReasons: { type: [String], default: [] },
    riskFlags: { type: [String], default: [] },
    reviewDecision: {
      type: String,
      enum: ["unreviewed", "shortlisted", "maybe", "rejected"],
      default: "unreviewed",
      index: true,
    },
    reviewedAt: { type: Date, default: null },
    awin: { type: awinDirectorySchema, default: undefined },
    lastCheckedAt: { type: Date, default: null, index: true },
    nextCheckDueAt: { type: Date, default: null, index: true },
    notes: { type: String, default: "" },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

affiliateProgrammeSchema.index({ name: 1, network: 1 }, { unique: true });
affiliateProgrammeSchema.index(
  { network: 1, "awin.advertiserId": 1 },
  {
    unique: true,
    partialFilterExpression: { "awin.advertiserId": { $type: "string" } },
  }
);
affiliateProgrammeSchema.index({ "awin.primaryRegion": 1, suggestedFit: 1, prospectScore: -1 });

module.exports = mongoose.model("AffiliateProgramme", affiliateProgrammeSchema);
