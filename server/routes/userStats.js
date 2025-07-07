import express from "express"
import QuizAttempt from "../models/QuizAttempt.js"
import Quiz from "../models/Quiz.js"
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js"

const router = express.Router()

/**
 * Helper: Calculate success rate for a user
 */
async function calculateSuccessRate(userId) {
  try {
    console.log(`📊 [SUCCESS_RATE] ===== CALCULATING SUCCESS RATE FOR USER: ${userId} =====`)

    // Get all attempts with quiz data to calculate success rate
    const successRateData = await QuizAttempt.aggregate([
      { $match: { userId: userId } },
      {
        $lookup: {
          from: "quizzes",
          localField: "quizId",
          foreignField: "_id",
          as: "quiz",
        },
      },
      { $unwind: { path: "$quiz", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          calculatedTotalPoints: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$quiz.questions", []] } }, 0] },
              then: { $sum: "$quiz.questions.points" },
              else: { $size: { $ifNull: ["$quiz.questions", []] } },
            },
          },
        },
      },
      {
        $project: {
          score: 1,
          quizTitle: "$quiz.title",
          totalPoints: "$calculatedTotalPoints",
          questionsCount: { $size: { $ifNull: ["$quiz.questions", []] } },
        },
      },
    ])

    console.log(`📊 [SUCCESS_RATE] Aggregation found ${successRateData.length} attempts`)

    if (successRateData.length === 0) {
      console.log(`📊 [SUCCESS_RATE] No attempts found for user: ${userId}`)
      return 0
    }

    // Calculate totals
    let totalScoreAchieved = 0
    let totalPossibleScore = 0

    successRateData.forEach((attempt, index) => {
      console.log(`📊 [SUCCESS_RATE] Attempt ${index + 1}:`, {
        quiz: attempt.quizTitle,
        score: attempt.score,
        totalPoints: attempt.totalPoints,
        questionsCount: attempt.questionsCount,
      })

      totalScoreAchieved += attempt.score || 0
      totalPossibleScore += attempt.totalPoints || 0
    })

    console.log(`📊 [SUCCESS_RATE] TOTALS:`)
    console.log(`📊 [SUCCESS_RATE] Total Score Achieved: ${totalScoreAchieved}`)
    console.log(`📊 [SUCCESS_RATE] Total Possible Score: ${totalPossibleScore}`)

    const successRate = totalPossibleScore > 0 ? Math.round((totalScoreAchieved / totalPossibleScore) * 100) : 0

    console.log(`📊 [SUCCESS_RATE] FINAL SUCCESS RATE: ${successRate}%`)
    console.log(`📊 [SUCCESS_RATE] ===== END CALCULATION =====`)

    return successRate
  } catch (error) {
    console.error("❌ [SUCCESS_RATE] Error calculating success rate:", error)
    return 0
  }
}

// GET /api/users/profile/stats - Get user quiz statistics (updated path)
router.get("/profile/stats", verifyFirebaseToken, async (req, res) => {
  try {
    console.log("🔄 Getting user stats for UID:", req.user?.uid)

    const uid = req.user?.uid
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    // Get all attempts by this user
    const attempts = await QuizAttempt.find({ userId: uid }).sort({ createdAt: -1 }).lean()
    console.log(`Found ${attempts.length} attempts for user ${uid}`)

    // Get quiz details for each attempt to build proper quiz stats
    const quizStats = await Promise.all(
      attempts.map(async (attempt) => {
        try {
          const quiz = await Quiz.findById(attempt.quizId).lean()
          if (!quiz) return null

          const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0)

          return {
            quizId: attempt.quizId,
            quizTitle: quiz.title,
            title: quiz.title,
            score: attempt.score || 0,
            maxScore: totalPoints,
            totalPoints: totalPoints,
            timeTaken: attempt.timeTaken || 0,
            completedAt: attempt.createdAt,
            createdAt: attempt.createdAt,
          }
        } catch (error) {
          console.error("Error fetching quiz for attempt:", error)
          return null
        }
      }),
    )

    // Filter out null results
    const validStats = quizStats.filter((stat) => stat !== null)

    // Get quizzes created by this user
    const createdQuizzes = await Quiz.find({ creatorId: uid }).lean()
    console.log(`Found ${createdQuizzes.length} quizzes created by user ${uid}`)

    // Calculate statistics
    const totalQuizzesTaken = validStats.length
    const totalScore = validStats.reduce((sum, stat) => sum + (stat.score || 0), 0)
    const totalPossibleScore = validStats.reduce((sum, stat) => sum + (stat.totalPoints || 0), 0)
    const averageScore = totalQuizzesTaken > 0 ? Math.round((totalScore / totalQuizzesTaken) * 100) / 100 : 0
    const averagePercentage = totalPossibleScore > 0 ? Math.round((totalScore / totalPossibleScore) * 100) : 0

    // Get best score
    const bestScore = validStats.length > 0 ? Math.max(...validStats.map((s) => s.score || 0)) : 0

    // FIXED: Calculate success rate using the proper function
    const successRate = await calculateSuccessRate(uid)

    console.log("User stats calculated:", {
      totalQuizzesTaken,
      totalScore,
      averageScore,
      averagePercentage,
      bestScore,
      successRate, // ADDED
      quizzesCreated: createdQuizzes.length,
    })

    res.json({
      success: true,
      quizStats: validStats, // This is what the frontend expects
      stats: {
        totalQuizzesTaken,
        totalQuizzes: totalQuizzesTaken, // Add both for compatibility
        totalScore,
        averageScore,
        averagePercentage,
        bestScore,
        successRate, // FIXED: Now included
        quizzesCreated: createdQuizzes.length,
      },
    })
  } catch (error) {
    console.error("❌ Error getting user stats:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get user statistics",
      error: error.message,
    })
  }
})

export default router
