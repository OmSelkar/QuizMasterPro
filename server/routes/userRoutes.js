import express from "express"
import { authenticateToken } from "../middlewares/auth.js"
import User from "../models/User.js"
import QuizAttempt from "../models/QuizAttempt.js"
import Quiz from "../models/Quiz.js"
import { privacyFilter } from "../middlewares/privacy-filter.js"
import admin from "firebase-admin"

const router = express.Router()

/**
 * GET /api/users/:userId/public-profile
 * Get public profile information for a user
 */
router.get("/:userId/public-profile", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params
    const viewerUserId = req.uid

    console.log(`🔍 Fetching public profile for userId: ${userId}`)

    // First try to get user from MongoDB
    let userProfile = await User.findOne({ firebaseUid: userId }).lean()
    
    // If not found in MongoDB, try to get from Firebase
    if (!userProfile) {
      try {
        const firebaseUser = await admin.auth().getUser(userId)
        userProfile = {
          firebaseUid: userId,
          displayName: firebaseUser.displayName || firebaseUser.email || "Anonymous",
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || "",
          createdAt: new Date(firebaseUser.metadata.creationTime),
          privacy: {
            profileVisibility: true,
            leaderboardVisibility: true,
            showEmail: false,
            showLocation: true,
            showAge: true,
            allowDirectMessages: true,
            showOnlineStatus: true,
            showQuizHistory: true,
            allowProfileSearch: true,
            showAchievements: true,
          }
        }
      } catch (firebaseError) {
        console.log(`❌ User not found in Firebase: ${userId}`)
        return res.status(404).json({
          success: false,
          message: "User not found"
        })
      }
    }

    // Apply privacy filtering
    const filteredProfile = privacyFilter(userProfile, viewerUserId)
    
    if (!filteredProfile) {
      return res.status(404).json({
        success: false,
        message: "Profile not accessible"
      })
    }

    // Get quiz statistics if privacy allows
    let quizStats = null
    if (filteredProfile.showQuizHistory !== false) {
      try {
        const attempts = await QuizAttempt.find({ userId }).lean()
        const totalAttempts = attempts.length
        const averageScore = totalAttempts > 0 
          ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts)
          : 0
        const bestScore = totalAttempts > 0 
          ? Math.max(...attempts.map(a => a.score || 0))
          : 0

        quizStats = {
          totalAttempts,
          averageScore,
          bestScore,
          recentAttempts: attempts
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map(attempt => ({
              quizId: attempt.quizId,
              score: attempt.score,
              timeTaken: attempt.timeTaken,
              createdAt: attempt.createdAt
            }))
        }
      } catch (statsError) {
        console.log(`❌ Error fetching quiz stats: ${statsError.message}`)
      }
    }

    res.json({
      success: true,
      profile: {
        ...filteredProfile,
        quizStats
      }
    })
  } catch (error) {
    console.error("❌ Error fetching public profile:", error)
    res.status(500).json({
      success: false,
      message: "Server error"
    })
  }
})

/**
 * GET /api/users/profile/performance
 * Get current user's performance data
 */
router.get("/profile/performance", authenticateToken, async (req, res) => {
  try {
    const userId = req.uid

    console.log(`📊 Fetching performance data for userId: ${userId}`)

    // Get user's attempts
    const attempts = await QuizAttempt.find({ userId }).sort({ createdAt: -1 }).lean()

    // Get quiz details for each attempt
    const performanceData = await Promise.all(
      attempts.map(async (attempt) => {
        try {
          const quiz = await Quiz.findById(attempt.quizId).lean()
          if (!quiz) return null

          return {
            attemptId: attempt._id,
            quizId: attempt.quizId,
            quiz: {
              title: quiz.title,
              description: quiz.description,
              category: quiz.category,
              creatorName: quiz.creatorName
            },
            score: attempt.score,
            maxPossibleScore: quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0),
            percentage: Math.round(((attempt.score || 0) / Math.max(quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0), 1)) * 100),
            timeTaken: attempt.timeTaken,
            createdAt: attempt.createdAt
          }
        } catch (error) {
          console.log(`❌ Error processing attempt ${attempt._id}:`, error.message)
          return null
        }
      })
    )

    // Filter out null results
    const validPerformanceData = performanceData.filter(data => data !== null)

    // Calculate overall statistics
    const totalAttempts = validPerformanceData.length
    const averageScore = totalAttempts > 0 
      ? Math.round(validPerformanceData.reduce((sum, data) => sum + data.score, 0) / totalAttempts)
      : 0
    const averagePercentage = totalAttempts > 0
      ? Math.round(validPerformanceData.reduce((sum, data) => sum + data.percentage, 0) / totalAttempts)
      : 0
    const bestScore = totalAttempts > 0
      ? Math.max(...validPerformanceData.map(data => data.score))
      : 0

    res.json({
      success: true,
      performance: {
        attempts: validPerformanceData,
        statistics: {
          totalAttempts,
          averageScore,
          averagePercentage,
          bestScore
        }
      }
    })
  } catch (error) {
    console.error("❌ Error fetching performance data:", error)
    res.status(500).json({
      success: false,
      message: "Server error"
    })
  }
})

export default router