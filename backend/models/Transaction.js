const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: "GBP"
  },
  date: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ["subscription", "refund"],
    default: "subscription"
  },
  category: {
    type: String,
    required: true // e.g., "Gold Plan", "Ad Credit"
  },
  paymentMethod: {
    type: String, // Stripe, PayPal, bank transfer, etc.
    default: "Stripe"
  },
  referenceId: {
    type: String // Stripe payment_intent ID, PayPal txn ID, etc.
  },
  vatIncluded: {
    type: Boolean,
    default: true
  },
  invoiceUrl: {
    type: String // populated when invoice PDF is generated (optional)
  },
  fileAvailable: {
    type: Boolean,
    default: true
  },
  reuploadUrl: {
    type: String, // signed URL for reuploading a missing/corrupted file (optional)
    default: null
  },
  missingReason: {
    type: String // optional reason why the file is missing
  },
  lastVerifiedAt: {
    type: Date // optional timestamp of last file health check
  }
});

module.exports = mongoose.model("Transaction", transactionSchema);
