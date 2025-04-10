const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  action: { type: String, required: true },
  details: { type: Object },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Interaction", interactionSchema);
