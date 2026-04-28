const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  action: { type: String, required: true },
  details: { type: Object },
  userAgent: { type: String },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model("Interaction", interactionSchema);
