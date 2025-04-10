// backend/models/Review.js

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String }, // Optional, could store at time of review
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String, required: true },
  reply: { type: String },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true
});

module.exports = mongoose.model("Review", reviewSchema);
