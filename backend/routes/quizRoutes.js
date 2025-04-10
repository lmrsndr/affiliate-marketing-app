const express = require("express");
const router = express.Router();
const { submitQuiz, getQuizResult } = require("../controllers/quizController");
const authenticateToken = require("../middleware/authMiddleware");

// ✅ Submit Quiz – Authenticated users only
router.post("/", authenticateToken, submitQuiz);

// ✅ Get Quiz Result – Authenticated users can only access their own results
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await getQuizResult(req.params.id);

    if (!result) {
      return res.status(404).json({ message: "Quiz result not found" });
    }

    if (result.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(result);
  } catch (error) {
    console.error("❌ Error retrieving quiz result:", error);
    res.status(500).json({ message: "Error retrieving quiz result" });
  }
});

module.exports = router;
