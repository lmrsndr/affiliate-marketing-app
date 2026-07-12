const mongoose = require("mongoose");

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
    lastCheckedAt: { type: Date, default: null, index: true },
    nextCheckDueAt: { type: Date, default: null, index: true },
    notes: { type: String, default: "" },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

affiliateProgrammeSchema.index({ name: 1, network: 1 }, { unique: true });

module.exports = mongoose.model("AffiliateProgramme", affiliateProgrammeSchema);
