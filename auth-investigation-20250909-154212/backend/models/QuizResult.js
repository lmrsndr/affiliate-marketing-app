// 📌 MongoDB Schema for Quiz Results
const mongoose = require("mongoose");

const QuizResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  selectedCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
  answers: { type: Array, required: true },
  recommendedBoxes: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionBox" }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("QuizResult", QuizResultSchema);
