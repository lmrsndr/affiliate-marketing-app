// 📌 MongoDB Schema for Subscription Boxes
const mongoose = require("mongoose");

const SubscriptionBoxSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  description: { type: String },
  price: { type: String },
  website: { type: String },
  affiliateLink: { type: String, required: true },
  rating: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("SubscriptionBox", SubscriptionBoxSchema);
