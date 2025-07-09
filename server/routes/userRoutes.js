import express from "express"
import User from "../models/User.js"
import QuizAttempt from "../models/QuizAttempt.js"
import Quiz from "../models/Quiz.js"
import { unifiedAuth } from "../middlewares/unifiedAuth.js"
import { privacyFilter } from "../middlewares/privacy-filter.js"
import admin from "firebase-admin"

const router = express.Router()

/**
 * Helper: get current user id and display name from unified auth
 */
function getCurrentUser(req) {
  if (req.auth) {
    const name = req.user?.displayName || req.user?.name || req.user?.email || "User"
    return { id: req.auth.id, type: req.auth.type, name }
  }
  return null
}

/**
 * Helper: Update user's last seen timestamp (unified)
 */
async function updateUserLastSeen(authId, authType) {
  try {
    await User.findOneAndUpdate(
      { authId, authType },
      {
        lastSeen: new Date(),
        isOnline: true,
      },
      { upsert: false, new: true },
    )
    console.log(`✅ Updated last seen for user: ${authId} (${authType})`)
  } catch (error) {
    console.error("❌ Error updating user last seen:", error)
  }
}

/**
 * Helper function to calculate comprehensive user statistics (unified)
 */
async function calculateUserStatistics(authId) {
  try {
    console.log(`📊 Calculating comprehensive stats for user: ${authId}`)

    // Get all quiz attempts with populated quiz data
    const attempts = await QuizAttempt.find({ userId: authId })
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
    const quizzesCreated = await Quiz.countDocuments({ creatorId: authId })

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
 * Helper function to get user's online status
 */
function getOnlineStatusDisplay(user) {
  if (!user) return { text: "Unknown", color: "bg-gray-400" }

  if (user.isOnline) {
    return { text: "Online", color: "bg-green-500" }
  } else if (user.lastSeen) {
    const lastSeenDate = new Date(user.lastSeen)
    const now = new Date()
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60))

    if (diffInMinutes < 5) {
      return { text: "Just now", color: "bg-yellow-500" }
    } else if (diffInMinutes < 60) {
      return { text: `${diffInMinutes}m ago`, color: "bg-yellow-500" }
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return { text: `${hours}h ago`, color: "bg-orange-500" }
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return { text: `${days}d ago`, color: "bg-red-500" }
    }
  }

  return { text: "Unknown", color: "bg-gray-400" }
}

/**
 * Robust helper function to find or create user safely (unified)
 */
async function findOrCreateUserSafely(authId, authType) {
  try {
    console.log(`🔍 Finding or creating user: ${authId} (${authType})`)

    // First, try to find existing user
    const user = await User.findOne({ authId, authType }).lean()
    if (user) {
      console.log(`✅ Found existing user: ${authId}`)
      return user
    }

    // For JWT users, we don't auto-create - they must register first
    if (authType === "jwt") {
      console.log(`❌ JWT user not found and won't be auto-created: ${authId}`)
      return null
    }

    // For Firebase users, try to get from Firebase and create
    let firebaseUser = null
    try {
      firebaseUser = await admin.auth().getUser(authId)
      console.log(`🔥 Firebase user found: ${firebaseUser.email}`)
    } catch (firebaseError) {
      console.log(`❌ Firebase user not found: ${authId}`)
      return null
    }

    // Try to create new Firebase user with retry logic
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      try {
        console.log(`🔄 Creating Firebase user attempt ${attempts + 1}/${maxAttempts}`)

        const newUser = await User.create({
          authId,
          authType: "firebase",
          email: firebaseUser.email || null,
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Quiz User",
          photoURL: firebaseUser.photoURL || null,
          provider: firebaseUser.providerData[0]?.providerId || "firebase",
          bio: "Quiz enthusiast",
          privacy: {
            profileVisibility: true,
            leaderboardVisibility: true,
            showEmail: false,
            showLocation: true,
            showStats: true,
            showQuizHistory: true,
            showSocialLinks: true,
          },
          lastSeen: new Date(),
          isOnline: true,
        })

        console.log(`✅ Successfully created Firebase user: ${authId}`)
        return newUser.toObject()
      } catch (createError) {
        attempts++

        if (createError.code === 11000) {
          // Duplicate key error - user was created by another request
          console.log(`🔄 Duplicate key detected, fetching existing user...`)
          const existingUser = await User.findOne({ authId, authType }).lean()
          if (existingUser) {
            console.log(`✅ Found user after race condition: ${authId}`)
            return existingUser
          }
        }

        if (attempts >= maxAttempts) {
          console.error(`❌ Failed to create user after ${maxAttempts} attempts:`, createError)
          throw createError
        }

        // Wait a bit before retrying
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    return null
  } catch (error) {
    console.error(`❌ Error in findOrCreateUserSafely for ${authId} (${authType}):`, error)
    return null
  }
}

// Public profile route - NO authentication required
router.get("/:userId/public-profile", async (req, res) => {
  try {
    const userId = req.params.userId
    console.log(`🌐 [PUBLIC] Fetching public profile for: ${userId}`)

    // Try to find user by authId (could be Firebase UID or JWT user ID)
    let user = await User.findOne({ authId: userId }).lean()
    
    if (!user) {
      console.log(`❌ [PUBLIC] User not found: ${userId}`)
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Check privacy settings
    if (!user.privacy?.profileVisibility || !user.privacy?.allowProfileViewing) {
      return res.status(403).json({
        success: false,
        message: "This profile is private",
      })
    }

    // Calculate comprehensive statistics
    const stats = await calculateUserStatistics(userId)

    // Get online status
    const onlineStatus = getOnlineStatusDisplay(user)

    // Prepare profile data with proper privacy filtering
    const publicProfile = {
      uid: user.authId,
      authId: user.authId,
      authType: user.authType,
      name: user.displayName || "Quiz User",
      displayName: user.displayName || "Quiz User",
      email: user.privacy?.showEmail ? user.email : null,
      photoURL: user.photoURL || "/placeholder.svg?height=100&width=100",
      bio: user.bio || "Quiz enthusiast",
      location: user.privacy?.showLocation ? user.location || "" : "",
      website: user.privacy?.showSocialLinks ? user.website || "" : "",
      linkedin: user.privacy?.showSocialLinks ? user.linkedin || "" : "",
      github: user.privacy?.showSocialLinks ? user.github || "" : "",
      twitter: user.privacy?.showSocialLinks ? user.twitter || "" : "",
      age: user.privacy?.showAge ? user.age : null,
      skills: user.privacy?.showSocialLinks ? user.skills || [] : [],
      interests: user.privacy?.showSocialLinks ? user.interests || [] : [],
      occupation: user.occupation || "",
      education: user.education || "",
      isOnline: user.privacy?.showOnlineStatus ? user.isOnline || false : false,
      lastSeen: user.privacy?.showOnlineStatus ? user.lastSeen : null,
      createdAt: user.createdAt,
      joinedDate: user.createdAt,
      provider: user.provider || "email",
      onlineStatus: user.privacy?.showOnlineStatus ? onlineStatus : { text: "Hidden", color: "bg-gray-400" },
    }

    // Apply privacy settings to stats
    const publicStats = user.privacy?.showStats ? {
      totalQuizzes: stats.totalQuizzesTaken,
      totalQuizzesCreated: stats.totalQuizzesCreated,
      quizzesCreated: stats.totalQuizzesCreated,
      perfectScores: stats.perfectScores,
      totalTimeSpent: stats.totalTimeSpent,
      totalAttempts: stats.totalQuizzesTaken,
    } : {
      totalQuizzes: 0,
      totalQuizzesCreated: 0,
      quizzesCreated: 0,
      perfectScores: 0,
      totalTimeSpent: 0,
      totalAttempts: 0,
    }

    // Apply privacy settings to recent attempts
    const publicRecentAttempts = user.privacy?.showQuizHistory ? stats.recentAttempts.slice(0, 5) : []

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

// Performance endpoint with unified auth
router.get("/profile/performance", unifiedAuth, async (req, res) => {
  try {
    const { id: authId, type: authType } = req.auth
    console.log("🔍 Fetching profile performance for user:", authId, authType)

    if (!authId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    // Use the safe user finding function
    const userProfile = await findOrCreateUserSafely(authId, authType)

    if (!userProfile) {
      console.error(`❌ Failed to get user profile for: ${authId} (${authType})`)
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Update last seen for existing users
    await updateUserLastSeen(authId, authType)

    // Calculate comprehensive statistics
    const stats = await calculateUserStatistics(authId)

    // Update cached stats in database
    await User.findOneAndUpdate(
      { authId, authType },
      {
        $set: {
          "stats.totalQuizzesTaken": stats.totalQuizzesTaken,
          "stats.totalQuizzesCreated": stats.totalQuizzesCreated,
          "stats.perfectScores": stats.perfectScores,
          "stats.totalTimeSpent": stats.totalTimeSpent,
          "stats.lastUpdated": new Date(),
        },
      },
    )

    // Prepare profile data in the format expected by UserProfileModal
    const profile = {
      uid: userProfile.authId,
      authId: userProfile.authId,
      authType: userProfile.authType,
      name: userProfile.displayName || "Quiz User",
      displayName: userProfile.displayName || "Quiz User",
      email: userProfile.email,
      photoURL: userProfile.photoURL || "/placeholder.svg?height=100&width=100",
      bio: userProfile.bio || "Quiz enthusiast and learner",
      location: userProfile.location || "",
      website: userProfile.website || "",
      linkedin: userProfile.linkedin || "",
      github: userProfile.github || "",
      twitter: userProfile.twitter || "",
      age: userProfile.age,
      skills: userProfile.skills || [],
      interests: userProfile.interests || [],
      occupation: userProfile.occupation || "",
      education: userProfile.education || "",
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: userProfile.createdAt,
      joinedDate: userProfile.createdAt,
      provider: userProfile.provider || "email",
      privacy: userProfile.privacy || {
        showEmail: true,
        showLocation: true,
        showStats: true,
        showQuizHistory: true,
        showSocialLinks: true,
      },
      settings: userProfile.settings,
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

    console.log("✅ Sending profile performance response:", {
      profileExists: !!response.profile,
      statsKeys: Object.keys(response.stats),
      recentAttemptsCount: response.recentAttempts.length,
    })

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

// Get user profile (unified)
router.get("/profile", unifiedAuth, async (req, res) => {
  try {
    const { id: authId, type: authType } = req.auth

    if (!authId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    const user = await User.findOne({ authId, authType }).select("-passwordHash")

    if (!user) {
      console.log("❌ User profile not found for authId:", authId, "authType:", authType)
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      })
    }

    console.log("✅ Profile found:", user._id)

    res.json({
      success: true,
      profile: user,
    })
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return res.status(500).json({
      success: false,
      message: "Server error fetching profile",
    })
  }
})

// Get user stats (unified)
router.get("/stats", unifiedAuth, async (req, res) => {
  try {
    const { id: authId, type: authType } = req.auth
    console.log(`📊 [USER STATS] Getting stats for user: ${authId} (${authType})`)

    if (!authId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    // Get user data from MongoDB
    let user = await User.findOne({ authId, authType }).lean()
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Calculate comprehensive statistics
    const stats = await calculateUserStatistics(authId)

    // Prepare response in the format expected by Profile.jsx
    const response = {
      success: true,
      stats: {
        totalQuizzesTaken: stats.totalQuizzesTaken,
        bestScore: 0, // Will be calculated from recent attempts
        averageScore: 0, // Will be calculated from recent attempts
        quizzesCreated: stats.totalQuizzesCreated,
      },
    }

    // Calculate best and average scores from recent attempts
    if (stats.recentAttempts.length > 0) {
      const scores = stats.recentAttempts.map((attempt) => {
        const maxScore = Math.max(attempt.maxPossibleScore || 1, 1)
        return Math.round((attempt.score / maxScore) * 100)
      })

      response.stats.bestScore = Math.max(...scores)
      response.stats.averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    }

    console.log(`📊 [USER STATS] Returning stats:`, response.stats)
    res.json(response)
  } catch (error) {
    console.error("❌ [USER STATS] Error getting user stats:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get user statistics",
      error: error.message,
    })
  }
})

// Update user profile (unified)
router.put("/profile", unifiedAuth, async (req, res) => {
  try {
    const { id: authId, type: authType } = req.auth
    const updates = req.body

    if (!authId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    // Don't allow updating certain fields
    delete updates.authId
    delete updates.authType
    delete updates.passwordHash
    delete updates.createdAt
    delete updates.updatedAt
    delete updates._id
    delete updates.__v

    const updatedUser = await User.findOneAndUpdate(
      { authId, authType }, 
      { ...updates, lastSeen: new Date(), isOnline: true }, 
      {
        new: true,
        runValidators: true,
      }
    ).select("-passwordHash")

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

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

// Update heartbeat (unified)
router.post("/heartbeat", unifiedAuth, async (req, res) => {
  try {
    const { id: authId, type: authType } = req.auth

    if (!authId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    await updateUserLastSeen(authId, authType)

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