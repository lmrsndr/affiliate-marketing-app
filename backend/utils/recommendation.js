const SubscriptionBox = require("../models/SubscriptionBox");

// @desc Generate subscription box recommendations based on quiz answers
exports.generateRecommendations = async (answers) => {
  try {
    // Fetch recommended subscription boxes based on user quiz answers
    const recommendedBoxes = await SubscriptionBox.find({ category: { $in: answers } });
    return recommendedBoxes;
  } catch (err) {
    console.error("Error generating recommendations", err);
    return [];
  }
};
