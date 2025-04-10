// backend/models/Partner.js
const mongoose = require("mongoose");

const partnerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  website: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  subscriptionTier: {
    type: String,
    enum: ["bronze", "silver", "gold", "dynamic"],
    default: "bronze",
  },
  customDomain: String,
  adVideo: String,      // path or URL to uploaded video
  adImage: String,      // path or URL to uploaded image
  clicks: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
}, {
  timestamps: true
});

module.exports = mongoose.model("Partner", partnerSchema);
