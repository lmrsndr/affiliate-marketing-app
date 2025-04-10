const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  vendor: {
    type: String,
    required: true // e.g. "AWS", "Cloudflare", "Render"
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: "GBP"
  },
  category: {
    type: String,
    required: true // e.g. "Hosting", "Fuel", "Petty Cash"
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  fileUrl: {
    type: String // public S3 URL or signed URL
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User" // optional: who uploaded the expense
  },
  fileAvailable: {
    type: Boolean,
    default: true
  },
  reuploadUrl: {
    type: String, // signed S3 URL for secure reupload
    default: null
  },
  missingReason: {
    type: String // e.g., "file manually deleted from S3"
  },
  lastVerifiedAt: {
    type: Date // when the file was last checked
  }
});

module.exports = mongoose.model("Expense", expenseSchema);
