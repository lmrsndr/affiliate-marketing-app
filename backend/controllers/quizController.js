const QuizResult = require("../models/QuizResult");
const SubscriptionBox = require("../models/SubscriptionBox");
const User = require("../models/User");

// @desc Submit a quiz and generate recommendations
// @route POST /api/quiz
exports.submitQuiz = async (req, res) => {
  try {
    const { userId, answers } = req.body;
    
    // Fetch recommended subscription boxes based on quiz answers
    const recommendedBoxes = await SubscriptionBox.find({ category: { $in: answers } });
    
    // Save quiz result
    const quizResult = new QuizResult({ user: userId, answers, recommendedBoxes });
    await quizResult.save();
    
    res.status(201).json({ msg: "Quiz submitted successfully!", recommendations: recommendedBoxes });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc Get quiz results for a user
// @route GET /api/quiz/:id
exports.getQuizResult = async (req, res) => {
  try {
    const quizResult = await QuizResult.findById(req.params.id).populate("recommendedBoxes");
    if (!quizResult) return res.status(404).json({ msg: "Quiz result not found" });
    
    res.json(quizResult);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};
