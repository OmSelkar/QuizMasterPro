import express from "express"
import User from "../models/User.js"
import QuizAttempt from "../models/QuizAttempt.js"
import Quiz from "../models/Quiz.js"
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js"
import { privacyFilter } from "../middlewares/privacy-filter.js"
import admin from "firebase-admin"

const router = express.Router()

/**
 * Helper function to calculate comprehensive user statistics
 */
async function calculateUserStatistics(userId) {
  try {
    console.log(`📊 Calculating comprehensive stats for user: ${userId}`)

    // Get all quiz attempts with populated quiz data
    const attempts = await QuizAttempt.find({ userId })
      .populate({
        path: "quizId",
        select: "title questions creatorId",
        match: { _id: { $exists: true } },
      })
      .sort({ createdAt: -1 })
      .lean()

    // Filter out attempts with null quizId (deleted quizzes)
    const validAttempts = attempts.filter((attempt) => attempt.quizId != null)

    // Get created quizzes count
    const quizzesCreated = await Quiz.countDocuments({ creatorId: userId })

    if (validAttempts.length === 0) {
      return {
        totalQuizzesTaken: 0,
        totalQuizzesCreated: quizzesCreated,
        perfectScores: 0,
        totalTimeSpent: 0,
        recentAttempts: [],
      }
    }

    let totalTimeSpent = 0
    let perfectScores = 0
    const recentAttempts = []

    // Process each attempt
    validAttempts.forEach((attempt) => {
      const score = attempt.score || 0
      const timeTaken = attempt.timeTaken || 0

      // Convert time to seconds if it's in milliseconds
      const timeInSeconds = timeTaken > 10000 ? Math.round(timeTaken / 1000) : timeTaken
      totalTimeSpent += timeInSeconds

      // Calculate possible score for this quiz
      let possibleScore = 1
      if (attempt.quizId && attempt.quizId.questions) {
        possibleScore = attempt.quizId.questions.reduce((sum, q) => sum + (q.points || 1), 0)
      }

      // Check if it's a perfect score
      if (score === possibleScore && possibleScore > 0) {
        perfectScores++
      }

      // Add to recent attempts
      recentAttempts.push({
        id: attempt._id,
        quizTitle: attempt.quizId?.title || "Unknown Quiz",
        score: score,
        maxPossibleScore: possibleScore,
        completedAt: attempt.createdAt,
        timeTaken: timeInSeconds,
      })
    })

    const stats = {
      totalQuizzesTaken: validAttempts.length,
      totalQuizzesCreated: quizzesCreated,
      perfectScores: perfectScores,
      totalTimeSpent: totalTimeSpent,
      recentAttempts: recentAttempts.slice(0, 10), // Last 10 attempts
    }

    console.log(`📊 Calculated stats:`, stats)
    return stats
  } catch (error) {
    console.error("❌ Error calculating user statistics:", error)
    return {
      totalQuizzesTaken: 0,
      totalQuizzesCreated: 0,
      perfectScores: 0,
      totalTimeSpent: 0,
      recentAttempts: [],
    }
  }
}

/**
 * Helper function to find or create user safely
 */
async function findOrCreateUserSafely(userId) {
  try {
    console.log(`🔍 Finding or creating user: ${userId}`)

    // First, try to find existing user
    const user = await User.findOne({ firebaseUid: userId }).lean()
    if (user) {
      console.log(`✅ Found existing user: ${userId}`)
      return user
    }

    // If user doesn't exist, get from Firebase and create
    let firebaseUser = null
    try {
      firebaseUser = await admin.auth().getUser(userId)
      console.log(`🔥 Firebase user found: ${firebaseUser.email}`)
    } catch (firebaseError) {
      console.log(`❌ Firebase user not found: ${userId}`)
      return null
    }

    // Create new user
    const newUser = await User.create({
      firebaseUid: userId,
      email: firebaseUser.email || null,
      displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Quiz User",
      photoURL: firebaseUser.photoURL || null,
      provider: firebaseUser.providerData[0]?.providerId || "email",
      bio: "Quiz enthusiast",
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
      },
      lastSeen: new Date(),
      isOnline: true,
    })

    console.log(`✅ Successfully created user: ${userId}`)
    return newUser.toObject()
  } catch (error) {
    console.error(`❌ Error in findOrCreateUserSafely for ${userId}:`, error)
    return null
  }
}

/**
 * GET /api/users/:userId/public-profile
 * Public profile route - NO authentication required
 */
router.get("/:userId/public-profile", async (req, res) => {
  try {
    const userId = req.params.userId
    console.log(`🌐 [PUBLIC] Fetching public profile for: ${userId}`)

    // Use the safe user creation function
    const user = await findOrCreateUserSafely(userId)

    if (!user) {
      console.log(`❌ [PUBLIC] User not found: ${userId}`)
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Check privacy settings
    if (user.privacy && user.privacy.profileVisibility === false) {
      return res.status(403).json({
        success: false,
        message: "This profile is private",
      })
    }

    // Get Firebase user data for additional info if available
    let firebaseUser = null
    try {
      firebaseUser = await admin.auth().getUser(userId)
    } catch (firebaseError) {
      console.log("Firebase lookup failed, using MongoDB data only")
    }

    // Calculate comprehensive statistics
    const stats = await calculateUserStatistics(userId)

    // Prepare profile data with proper privacy filtering
    const publicProfile = {
      uid: user.firebaseUid,
      name: user.displayName || firebaseUser?.displayName || user.email?.split("@")[0] || "Quiz User",
      displayName: user.displayName || firebaseUser?.displayName || user.email?.split("@")[0] || "Quiz User",
      email: user.privacy?.showEmail !== false ? user.email || firebaseUser?.email : null,
      photoURL: user.photoURL || firebaseUser?.photoURL || "/placeholder.svg?height=100&width=100",
      bio: user.bio || "Quiz enthusiast",
      location: user.privacy?.showLocation !== false ? user.location || "" : "",
      website: user.privacy?.showSocialLinks !== false ? user.website || "" : "",
      isOnline: user.privacy?.showOnlineStatus !== false ? user.isOnline || false : false,
      lastSeen: user.privacy?.showOnlineStatus !== false ? user.lastSeen : null,
      createdAt: firebaseUser?.metadata?.creationTime || user.createdAt,
      provider: user.provider || "email",
    }

    // Apply privacy settings to stats
    const publicStats =
      user.privacy?.showQuizHistory !== false
        ? {
            totalQuizzes: stats.totalQuizzesTaken,
            totalQuizzesCreated: stats.totalQuizzesCreated,
            perfectScores: stats.perfectScores,
            totalTimeSpent: stats.totalTimeSpent,
          }
        : {
            totalQuizzes: 0,
            totalQuizzesCreated: 0,
            perfectScores: 0,
            totalTimeSpent: 0,
          }

    // Apply privacy settings to recent attempts
    const publicRecentAttempts = user.privacy?.showQuizHistory !== false ? stats.recentAttempts.slice(0, 5) : []

    console.log(`✅ [PUBLIC] Public profile data prepared for: ${userId}`)

    res.json({
      success: true,
      profile: publicProfile,
      stats: publicStats,
      recentAttempts: publicRecentAttempts,
    })
  } catch (error) {
    console.error("❌ [PUBLIC] Error getting public profile:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      error: error.message,
    })
  }
})

/**
 * GET /api/users/profile/performance
 * Performance endpoint with proper error handling
 */
router.get("/profile/performance", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.uid
    console.log("🔍 Fetching profile performance for user:", uid)

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    // Use the safe user creation function
    const userProfile = await findOrCreateUserSafely(uid)

    if (!userProfile) {
      console.error(`❌ Failed to get or create user profile for: ${uid}`)
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Get Firebase user data
    let firebaseUser
    try {
      firebaseUser = await admin.auth().getUser(uid)
    } catch (firebaseError) {
      console.error("Firebase user lookup failed:", firebaseError)
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Update last seen for existing users
    await User.findOneAndUpdate(
      { firebaseUid: uid },
      {
        lastSeen: new Date(),
        isOnline: true,
      },
    )

    // Calculate comprehensive statistics
    const stats = await calculateUserStatistics(uid)

    // Prepare profile data in the format expected by UserProfileModal
    const profile = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || userProfile.displayName || firebaseUser.email?.split("@")[0] || "Quiz User",
      displayName:
        userProfile.displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Quiz User",
      email: firebaseUser.email,
      photoURL: userProfile.photoURL || firebaseUser.photoURL || "/placeholder.svg?height=100&width=100",
      bio: userProfile.bio || "Quiz enthusiast and learner",
      location: userProfile.location || "",
      website: userProfile.website || "",
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: firebaseUser.metadata.creationTime,
      joinedDate: firebaseUser.metadata.creationTime,
      provider: userProfile.provider || "email",
      privacy: userProfile.privacy || {
        showEmail: true,
        showLocation: true,
        showQuizHistory: true,
        showSocialLinks: true,
      },
    }

    const response = {
      success: true,
      profile: profile,
      stats: {
        totalQuizzes: stats.totalQuizzesTaken,
        totalQuizzesCreated: stats.totalQuizzesCreated,
        perfectScores: stats.perfectScores,
        totalTimeSpent: stats.totalTimeSpent,
        totalAttempts: stats.totalQuizzesTaken,
      },
      recentAttempts: stats.recentAttempts,
    }

    console.log("✅ Sending profile performance response")
    res.json(response)
  } catch (error) {
    console.error("❌ Error getting user performance:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get user performance data",
      error: error.message,
    })
  }
})

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.uid

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    // Get user from Firebase and MongoDB
    const firebaseUser = await admin.auth().getUser(userId)
    const mongoUser = await User.findOne({ firebaseUid: userId }).lean()

    // Combine data
    const profile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || mongoUser?.displayName,
      photoURL: firebaseUser.photoURL || mongoUser?.photoURL,
      emailVerified: firebaseUser.emailVerified,
      creationTime: firebaseUser.metadata.creationTime,
      lastSignInTime: firebaseUser.metadata.lastSignInTime,
      ...mongoUser,
      id: userId,
    }

    return res.json({
      success: true,
      profile,
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return res.status(500).json({
      success: false,
      message: "Server error fetching profile",
    })
  }
})

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.uid
    const {
      displayName,
      bio,
      location,
      website,
      privacy,
    } = req.body

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    // Update Firebase user if displayName changed
    if (displayName) {
      try {
        await admin.auth().updateUser(userId, { displayName })
      } catch (firebaseError) {
        console.error("Error updating Firebase user:", firebaseError)
      }
    }

    // Prepare MongoDB update data
    const mongoUpdateData = {
      lastSeen: new Date(),
      isOnline: true,
    }

    if (displayName !== undefined) mongoUpdateData.displayName = displayName
    if (bio !== undefined) mongoUpdateData.bio = bio
    if (location !== undefined) mongoUpdateData.location = location
    if (website !== undefined) mongoUpdateData.website = website
    if (privacy !== undefined) mongoUpdateData.privacy = { ...mongoUpdateData.privacy, ...privacy }

    const updatedUser = await User.findOneAndUpdate({ firebaseUid: userId }, mongoUpdateData, {
      upsert: true,
      new: true,
      runValidators: true,
    })

    return res.json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedUser,
    })
  } catch (error) {
    console.error("Error updating user profile:", error)
    return res.status(500).json({
      success: false,
      message: "Server error updating profile",
      error: error.message,
    })
  }
})

/**
 * POST /api/users/heartbeat
 * Update user's online status
 */
router.post("/heartbeat", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.uid

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    await User.findOneAndUpdate(
      { firebaseUid: userId },
      {
        firebaseUid: userId,
        lastSeen: new Date(),
        isOnline: true,
      },
      { upsert: true, new: true },
    )

    return res.json({
      success: true,
      message: "Heartbeat updated",
    })
  } catch (error) {
    console.error("Error updating heartbeat:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
})

export default router