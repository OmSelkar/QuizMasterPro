import admin from "firebase-admin"
import User from "../models/User.js"
import QuizAttempt from "../models/QuizAttempt.js"
import Quiz from "../models/Quiz.js"

/**
 * Helper: Update user's last seen timestamp
 */
async function updateUserLastSeen(userId) {
  try {
    await User.findOneAndUpdate(
      { firebaseUid: userId },
      {
        lastSeen: new Date(),
        isOnline: true,
      },
      { upsert: true, new: true },
    )
    console.log(`✅ Updated last seen for user: ${userId}`)
  } catch (error) {
    console.error("❌ Error updating user last seen:", error)
  }
}

/**
 * Helper: Check if user is online (last seen within 5 minutes)
 */
async function getUserOnlineStatus(userId) {
  try {
    const user = await User.findOne({ firebaseUid: userId }).lean()
    if (!user || !user.lastSeen) {
      return { isOnline: false, lastSeen: null }
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const isOnline = user.isOnline && user.lastSeen > fiveMinutesAgo

    return {
      isOnline,
      lastSeen: user.lastSeen,
    }
  } catch (error) {
    console.error("❌ Error checking user online status:", error)
    return { isOnline: false, lastSeen: null }
  }
}

/**
 * Helper: Get quiz stats for a specific user (ISOLATED FUNCTION)
 */
async function getQuizStatsForSpecificUser(targetUserId) {
  try {
    console.log(`📊 [ISOLATED] Getting quiz stats for SPECIFIC user: ${targetUserId}`)

    // Use a completely separate aggregation pipeline
    const pipeline = [
      {
        $match: {
          userId: targetUserId, // Explicitly match only this user
        },
      },
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
        $group: {
          _id: "$quizId",
          quizTitle: { $first: { $ifNull: ["$quiz.title", "Unknown Quiz"] } },
          maxScore: { $max: "$score" },
          totalPoints: {
            $first: {
              $ifNull: [
                { $sum: "$quiz.questions.points" },
                { $multiply: [{ $size: { $ifNull: ["$quiz.questions", []] } }, 1] },
              ],
            },
          },
          attempts: { $sum: 1 },
          lastAttempt: { $max: "$createdAt" },
        },
      },
      { $sort: { lastAttempt: -1 } },
      { $limit: 10 },
      {
        $project: {
          quizTitle: 1,
          maxScore: 1,
          totalPoints: { $max: ["$totalPoints", 1] }, // Ensure minimum of 1 to prevent division by zero
          attempts: 1,
          completedAt: "$lastAttempt",
        },
      },
    ]

    console.log(`📊 [ISOLATED] Running aggregation for user: ${targetUserId}`)
    const quizStats = await QuizAttempt.aggregate(pipeline)

    console.log(`📈 [ISOLATED] Quiz stats found: ${quizStats.length} entries for user ${targetUserId}`)
    console.log(`📈 [ISOLATED] Sample data:`, quizStats.slice(0, 2))

    return quizStats
  } catch (error) {
    console.error("❌ [ISOLATED] Error getting quiz stats:", error)
    return []
  }
}

/**
 * Helper: Calculate success rate for a user - ENHANCED DEBUG VERSION
 */
async function calculateSuccessRate(userId) {
  try {
    console.log(`📊 [SUCCESS_RATE] ===== CALCULATING SUCCESS RATE FOR USER: ${userId} =====`)

    // First, let's see what attempts exist for this user
    const rawAttempts = await QuizAttempt.find({ userId: userId }).lean()
    console.log(`📊 [SUCCESS_RATE] Found ${rawAttempts.length} raw attempts for user ${userId}`)
    console.log(`📊 [SUCCESS_RATE] Sample raw attempts:`, rawAttempts.slice(0, 3))

    if (rawAttempts.length === 0) {
      console.log(`📊 [SUCCESS_RATE] No attempts found for user: ${userId}`)
      return 0
    }

    // Get all attempts with quiz data to calculate success rate
    const successRateData = await QuizAttempt.aggregate([
      {
        $match: { userId: userId },
      },
      {
        $lookup: {
          from: "quizzes",
          localField: "quizId",
          foreignField: "_id",
          as: "quiz",
        },
      },
      {
        $unwind: { path: "$quiz", preserveNullAndEmptyArrays: true },
      },
      {
        $addFields: {
          calculatedTotalPoints: {
            $max: [
              {
                $cond: {
                  if: { $gt: [{ $size: { $ifNull: ["$quiz.questions", []] } }, 0] },
                  then: { $sum: "$quiz.questions.points" },
                  else: { $size: { $ifNull: ["$quiz.questions", []] } },
                },
              },
              1, // Ensure minimum of 1 to prevent division by zero
            ],
          },
        },
      },
      {
        $project: {
          score: 1,
          quizTitle: "$quiz.title",
          totalPoints: "$calculatedTotalPoints",
          questionsCount: { $size: { $ifNull: ["$quiz.questions", []] } },
          quizQuestions: "$quiz.questions",
        },
      },
    ])

    console.log(`📊 [SUCCESS_RATE] Aggregation result:`, successRateData)

    if (successRateData.length === 0) {
      console.log(`📊 [SUCCESS_RATE] No aggregation results for user: ${userId}`)
      return 0
    }

    // Calculate totals with proper validation
    let totalScoreAchieved = 0
    let totalPossibleScore = 0

    successRateData.forEach((attempt, index) => {
      const score = attempt.score || 0
      const totalPoints = Math.max(attempt.totalPoints || 1, 1) // Ensure minimum of 1

      console.log(`📊 [SUCCESS_RATE] Attempt ${index + 1}:`, {
        quiz: attempt.quizTitle,
        score: score,
        totalPoints: totalPoints,
        questionsCount: attempt.questionsCount,
      })

      totalScoreAchieved += score
      totalPossibleScore += totalPoints
    })

    console.log(`📊 [SUCCESS_RATE] TOTALS:`)
    console.log(`📊 [SUCCESS_RATE] Total Score Achieved: ${totalScoreAchieved}`)
    console.log(`📊 [SUCCESS_RATE] Total Possible Score: ${totalPossibleScore}`)

    const successRate =
      totalPossibleScore > 0 ? Math.min(Math.round((totalScoreAchieved / totalPossibleScore) * 100), 100) : 0

    console.log(`📊 [SUCCESS_RATE] FINAL SUCCESS RATE: ${successRate}%`)
    console.log(`📊 [SUCCESS_RATE] ===== END CALCULATION =====`)

    return successRate
  } catch (error) {
    console.error("❌ [SUCCESS_RATE] Error calculating success rate:", error)
    return 0
  }
}

// Get user profile (public endpoint - no auth required)
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid: userId })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Get user's quiz attempts for statistics
    const attempts = await QuizAttempt.find({ userId: userId })
    const quizzesCreated = await Quiz.countDocuments({ createdBy: userId })

    // Calculate statistics with proper validation
    const stats = calculateUserStats(attempts, quizzesCreated)

    // Return public profile information
    const publicProfile = {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      location: user.location,
      age: user.age,
      createdAt: user.createdAt,
    }

    res.json({
      success: true,
      profile: publicProfile,
      stats: stats,
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
    })
  }
}

// Calculate user statistics with proper validation
const calculateUserStats = (attempts, quizzesCreated) => {
  if (!attempts || attempts.length === 0) {
    return {
      totalAttempts: 0,
      quizzesCreated: quizzesCreated || 0,
      successRate: 0,
      averageTime: 0,
      bestScore: 0,
      totalPoints: 0,
    }
  }

  const totalAttempts = attempts.length

  // Calculate success rate (percentage of correct answers)
  let totalCorrect = 0
  let totalQuestions = 0
  let totalTime = 0
  let completedAttempts = 0
  let bestPercentage = 0
  let totalPoints = 0

  attempts.forEach((attempt) => {
    if (attempt.answers && Array.isArray(attempt.answers)) {
      const correct = attempt.answers.filter((answer) => answer.isCorrect).length
      const total = attempt.answers.length

      if (total > 0) {
        totalCorrect += correct
        totalQuestions += total

        // Calculate percentage for this attempt
        const percentage = Math.min((correct / total) * 100, 100)
        bestPercentage = Math.max(bestPercentage, percentage)
      }
    }

    // Calculate time taken
    if (attempt.completedAt && attempt.startedAt) {
      const timeTaken = new Date(attempt.completedAt) - new Date(attempt.startedAt)
      if (timeTaken > 0) {
        totalTime += timeTaken / 1000 // Convert to seconds
        completedAttempts++
      }
    }

    // Add to total points
    totalPoints += attempt.score || 0
  })

  // Calculate final statistics with proper bounds
  const successRate = totalQuestions > 0 ? Math.min(Math.round((totalCorrect / totalQuestions) * 100), 100) : 0

  const averageTime = completedAttempts > 0 ? Math.round(totalTime / completedAttempts) : 0

  return {
    totalAttempts,
    quizzesCreated: quizzesCreated || 0,
    successRate: Math.max(0, Math.min(successRate, 100)), // Ensure 0-100 range
    averageTime: Math.max(0, averageTime), // Ensure non-negative
    bestScore: Math.max(0, Math.min(Math.round(bestPercentage), 100)), // Ensure 0-100 range
    totalPoints: Math.max(0, totalPoints), // Ensure non-negative
  }
}

// Get current user's full profile (requires authentication)
export const getCurrentUserProfile = async (req, res) => {
  try {
    const userId = req.user.uid

    const user = await User.findOne({ firebaseUid: userId })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Get comprehensive stats for the current user
    const attempts = await QuizAttempt.find({ userId: userId })
    const quizzesCreated = await Quiz.countDocuments({ createdBy: userId })
    const stats = calculateUserStats(attempts, quizzesCreated)

    res.json({
      success: true,
      profile: user,
      stats: stats,
    })
  } catch (error) {
    console.error("Error fetching current user profile:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    })
  }
}

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.uid
    const updates = req.body

    // Validate and sanitize updates
    const allowedUpdates = ["displayName", "location", "age", "bio"]
    const sanitizedUpdates = {}

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        sanitizedUpdates[field] = updates[field]
      }
    })

    const user = await User.findOneAndUpdate({ firebaseUid: userId }, sanitizedUpdates, {
      new: true,
      runValidators: true,
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      profile: user,
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    })
  }
}

// NEW: Get public user profile (completely isolated from current user)
export const getPublicUserProfile = async (req, res) => {
  try {
    const { userId } = req.params

    console.log(`🌐 [PUBLIC] Fetching PUBLIC profile for userId: ${userId}`)
    console.log(`🌐 [PUBLIC] NO current user context - pure public data`)

    // Get online status for the requested user
    const onlineStatus = await getUserOnlineStatus(userId)
    console.log(`🟢 [PUBLIC] Online status for ${userId}:`, onlineStatus)

    // Get Firebase user data
    try {
      const firebaseUser = await admin.auth().getUser(userId)
      console.log(`🔥 [PUBLIC] Firebase user found:`, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
      })

      const profile = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Quiz User",
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL || "/placeholder.svg",
        bio: "Quiz enthusiast and learner",
        isOnline: onlineStatus.isOnline,
        lastSeen: onlineStatus.lastSeen ? onlineStatus.lastSeen.toISOString() : null,
        createdAt: firebaseUser.metadata.creationTime,
        profileVisibility: true,
      }

      // Get quiz statistics using the isolated function
      console.log(`📊 [PUBLIC] Getting quiz stats for user: ${userId}`)
      const quizStats = await getQuizStatsForSpecificUser(userId)

      // Calculate success rate
      const successRate = await calculateSuccessRate(userId)

      console.log(`📊 [PUBLIC] Final quiz stats count: ${quizStats.length}, Success rate: ${successRate}%`)

      return res.json({
        success: true,
        user: profile,
        quizStats: quizStats,
        stats: {
          totalQuizzes: quizStats.length,
          successRate: successRate,
        },
      })
    } catch (firebaseError) {
      console.log(`❌ [PUBLIC] Firebase lookup failed:`, firebaseError.message)
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      })
    }
  } catch (error) {
    console.error("❌ [PUBLIC] getPublicUserProfile error:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error.message,
    })
  }
}

// Get user profile by ID (LEGACY - keeping for backward compatibility)
export const getUserProfileLegacy = async (req, res) => {
  try {
    const { userId } = req.params
    const currentUserId = req.uid // May be undefined if not authenticated

    console.log(`🔍 [LEGACY] Fetching profile for userId: ${userId}`)
    console.log(`👤 [LEGACY] Current user: ${currentUserId}`)

    // Update current user's last seen if authenticated
    if (currentUserId) {
      await updateUserLastSeen(currentUserId)
    }

    // Check if it's the current user's own profile
    if (currentUserId && currentUserId === userId) {
      console.log(`📱 [LEGACY] Loading own profile for: ${userId}`)

      try {
        const firebaseUser = await admin.auth().getUser(userId)

        const profile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "You",
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL || "/placeholder.svg",
          emailVerified: firebaseUser.emailVerified || false,
          bio: "This is your profile.",
          isOnline: true,
          lastSeen: new Date().toISOString(),
          createdAt: firebaseUser.metadata.creationTime,
          profileVisibility: true,
        }

        // For own profile, use the isolated function
        const quizStats = await getQuizStatsForSpecificUser(userId)

        // Calculate success rate
        const successRate = await calculateSuccessRate(userId)

        return res.json({
          success: true,
          user: profile,
          quizStats: quizStats,
          stats: {
            totalQuizzes: quizStats.length,
            successRate: successRate,
          },
        })
      } catch (firebaseError) {
        console.log(`❌ [LEGACY] Firebase lookup failed for own profile:`, firebaseError.message)
        return res.status(404).json({
          success: false,
          message: "Profile not found",
        })
      }
    } else {
      // For other users, call the public profile function
      console.log(`🔄 [LEGACY] Redirecting to public profile for: ${userId}`)
      return await getPublicUserProfile(req, res)
    }
  } catch (error) {
    console.error("❌ [LEGACY] getUserProfile error:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error.message,
    })
  }
}

// Get current user's profile stats
export const getUserStats = async (req, res) => {
  try {
    const userId = req.uid // from verifyFirebaseToken middleware
    console.log(`📊 [STATS] ===== FETCHING STATS FOR CURRENT USER: ${userId} =====`)

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      })
    }

    // Update user's last seen
    await updateUserLastSeen(userId)

    // Get user info from Firebase
    let userProfile = {
      name: "Anonymous",
      email: null,
      photoURL: "/placeholder.svg",
    }

    try {
      const firebaseUser = await admin.auth().getUser(userId)
      userProfile = {
        name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Anonymous",
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL || "/placeholder.svg",
      }
      console.log(`🔥 [STATS] Firebase user data:`, userProfile)
    } catch (firebaseError) {
      console.log(`❌ [STATS] Firebase lookup failed:`, firebaseError.message)
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Get comprehensive quiz statistics using isolated function
    const quizStats = await getQuizStatsForSpecificUser(userId)

    // Get overall statistics with proper validation
    const overallStats = await QuizAttempt.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          totalScore: { $sum: "$score" },
          avgScore: { $avg: "$score" },
          bestScore: { $max: "$score" },
          totalTime: { $sum: "$timeTaken" },
        },
      },
    ])

    const stats = overallStats[0] || {
      totalAttempts: 0,
      totalScore: 0,
      avgScore: 0,
      bestScore: 0,
      totalTime: 0,
    }

    console.log(`📊 [STATS] Overall stats from aggregation:`, stats)

    // Calculate success rate properly
    const successRate = await calculateSuccessRate(userId)

    console.log(`📈 [STATS] Final stats summary:`, {
      quizCount: quizStats.length,
      totalAttempts: stats.totalAttempts,
      totalScore: stats.totalScore,
      avgScore: stats.avgScore,
      bestScore: stats.bestScore,
      successRate: successRate,
    })

    const finalStats = {
      totalQuizzes: quizStats.length,
      totalQuizzesTaken: quizStats.length,
      totalAttempts: stats.totalAttempts,
      averageScore: Math.round(stats.avgScore || 0),
      bestScore: stats.bestScore || 0,
      successRate: Math.min(successRate, 100), // Ensure max 100%
      totalTimeSpent: stats.totalTime || 0,
      quizzesCreated: 0, // TODO: Add this if needed
    }

    console.log(`📊 [STATS] ===== FINAL RESPONSE STATS: =====`, finalStats)

    return res.json({
      success: true,
      user: userProfile,
      quizStats: quizStats,
      stats: finalStats,
    })
  } catch (error) {
    console.error("❌ [STATS] getUserStats error:", error)
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics",
      error: error.message,
    })
  }
}

// Update user online status
export const updateUserStatus = async (req, res) => {
  try {
    const userId = req.uid
    const { isOnline = true } = req.body

    console.log(`🔄 Updating status for user: ${userId}, online: ${isOnline}`)

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required",
      })
    }

    try {
      const existingUser = await User.findOne({ firebaseUid: userId })

      if (existingUser) {
        existingUser.isOnline = isOnline
        existingUser.lastSeen = new Date()
        await existingUser.save()
      } else {
        await User.create({
          firebaseUid: userId,
          isOnline: isOnline,
          lastSeen: new Date(),
        })
      }

      console.log(`✅ Status updated for user: ${userId}`)

      return res.json({
        success: true,
        message: "Status updated successfully",
      })
    } catch (dbError) {
      console.error("❌ Database error in updateUserStatus:", dbError)
      return res.json({
        success: true,
        message: "Status update processed",
      })
    }
  } catch (error) {
    console.error("❌ updateUserStatus error:", error)
    return res.json({
      success: true,
      message: "Request processed",
    })
  }
}

// Set user offline
export const setUserOffline = async (req, res) => {
  try {
    const userId = req.uid

    console.log(`📴 Setting user offline: ${userId}`)

    if (!userId) {
      console.error("❌ No userId provided in setUserOffline")
      return res.json({
        success: true,
        message: "Request processed",
      })
    }

    try {
      const existingUser = await User.findOne({ firebaseUid: userId })

      if (existingUser) {
        existingUser.isOnline = false
        existingUser.lastSeen = new Date()
        await existingUser.save()
      } else {
        await User.create({
          firebaseUid: userId,
          isOnline: false,
          lastSeen: new Date(),
        })
      }

      console.log(`✅ User set offline successfully: ${userId}`)

      return res.json({
        success: true,
        message: "User set offline successfully",
      })
    } catch (dbError) {
      console.error("❌ Database error in setUserOffline:", dbError)
      return res.json({
        success: true,
        message: "Offline status processed",
      })
    }
  } catch (error) {
    console.error("❌ setUserOffline error:", error)
    return res.json({
      success: true,
      message: "Request processed",
    })
  }
}

// Default export with all functions
export default {
  getUserProfile,
  getCurrentUserProfile,
  updateUserProfile,
  getUserProfileLegacy,
  getUserStats,
  updateUserStatus,
  setUserOffline,
}
