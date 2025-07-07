import express from "express"
import User from "../models/User.js"
import QuizAttempt from "../models/QuizAttempt.js"
import Quiz from "../models/Quiz.js"
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js"
import { privacyFilter } from "../middlewares/privacy-filter.js"
import { getPublicUserProfile, getUserStats } from "../controllers/userController.js"
import admin from "firebase-admin"
import { updateUserStatus, setUserOffline } from "../controllers/userController.js"
const router = express.Router()

router.post("/status", verifyFirebaseToken, updateUserStatus)
router.post("/offline", verifyFirebaseToken, setUserOffline)
// GET /api/users/profile - Get current user profile
router.get("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.uid

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    // Try to get user from Firebase
    let userProfile = null
    try {
      const firebaseUser = await admin.auth().getUser(userId)
      userProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        creationTime: firebaseUser.metadata.creationTime,
        lastSignInTime: firebaseUser.metadata.lastSignInTime,
      }
    } catch (firebaseError) {
      console.error("Error fetching Firebase user:", firebaseError)
    }

    // Try to get additional user data from MongoDB
    let mongoUser = null
    try {
      mongoUser = await User.findOne({ firebaseUid: userId }).lean()
    } catch (mongoError) {
      console.error("Error fetching MongoDB user:", mongoError)
    }

    // Combine data
    const profile = {
      ...userProfile,
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

// GET /api/users/profile/stats - Get current user profile with stats
router.get("/profile/stats", verifyFirebaseToken, getUserStats)

// GET /api/users/:userId/public-profile - Get public user profile (no auth required)
router.get("/:userId/public-profile", getPublicUserProfile)

// PUT /api/users/profile - Update user profile
router.put("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.uid
    const { displayName, bio, preferences } = req.body

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    // Update Firebase user
    const updateData = {}
    if (displayName) updateData.displayName = displayName

    if (Object.keys(updateData).length > 0) {
      await admin.auth().updateUser(userId, updateData)
    }

    // Update MongoDB user
    const mongoUpdateData = {
      firebaseUid: userId,
      lastSeen: new Date(),
      isOnline: true,
    }

    if (displayName) mongoUpdateData.displayName = displayName
    if (bio) mongoUpdateData.bio = bio
    if (preferences) mongoUpdateData.preferences = preferences

    const updatedUser = await User.findOneAndUpdate({ firebaseUid: userId }, mongoUpdateData, {
      upsert: true,
      new: true,
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
    })
  }
})

// POST /api/users/heartbeat - Update user's online status
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

// Get user by ID (public profile)
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.userId }).lean()

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Apply privacy filter for public view
    const requestingUser = req.user ? await User.findOne({ firebaseUid: req.user.uid }).lean() : null
    const filteredUser = privacyFilter(user, requestingUser)

    res.json({
      success: true,
      user: filteredUser,
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    })
  }
})

// GET /api/users/profile/:userId/public - Get public user profile (no auth required)
router.get("/profile/:userId/public", async (req, res) => {
  try {
    const { userId } = req.params
    console.log("🔄 Fetching public profile for user:", userId)

    const user = await User.findOne({ firebaseUid: userId }).select(
      "displayName photoURL bio location createdAt privacy",
    )

    if (!user) {
      console.log("❌ User not found:", userId)
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Check privacy settings
    if (user.privacy && !user.privacy.profileVisibility) {
      console.log("❌ Profile is private:", userId)
      return res.status(403).json({
        success: false,
        message: "This profile is private",
      })
    }

    // Return only public information
    const publicProfile = {
      displayName: user.displayName,
      photoURL: user.photoURL,
      bio: user.bio,
      location: user.privacy?.showLocation ? user.location : null,
      createdAt: user.createdAt,
    }

    console.log("✅ Public profile fetched successfully")
    res.json({
      success: true,
      profile: publicProfile,
    })
  } catch (error) {
    console.error("❌ Error fetching public profile:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: error.message,
    })
  }
})

// GET /api/users/:userId/stats - Get user statistics
router.get("/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params
    console.log("🔄 Fetching stats for user:", userId)

    // Get user
    const user = await User.findOne({ firebaseUid: userId })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Check if stats should be visible
    if (user.privacy && !user.privacy.showQuizHistory) {
      return res.json({
        success: true,
        stats: {
          totalAttempts: 0,
          quizzesCreated: 0,
          correctAnswers: 0,
          totalQuestions: 0,
          totalTimeSpent: 0,
          recentAttempts: [],
        },
      })
    }

    // Get quiz attempts
    const attempts = await QuizAttempt.find({ userId }).populate("quizId", "title")

    // Get created quizzes
    const createdQuizzes = await Quiz.find({ createdBy: userId })

    // Calculate statistics
    const totalAttempts = attempts.length
    const quizzesCreated = createdQuizzes.length

    let correctAnswers = 0
    let totalQuestions = 0
    let totalTimeSpent = 0

    attempts.forEach((attempt) => {
      if (attempt.answers && Array.isArray(attempt.answers)) {
        attempt.answers.forEach((answer) => {
          totalQuestions++
          if (answer.isCorrect) {
            correctAnswers++
          }
        })
      }
      totalTimeSpent += attempt.timeSpent || 0
    })

    // Get recent attempts (last 5)
    const recentAttempts = attempts
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 5)
      .map((attempt) => ({
        quizTitle: attempt.quizId?.title || "Unknown Quiz",
        score: attempt.score || 0,
        totalQuestions: attempt.answers?.length || 0,
        completedAt: attempt.completedAt,
      }))

    const stats = {
      totalAttempts,
      quizzesCreated,
      correctAnswers,
      totalQuestions,
      totalTimeSpent,
      recentAttempts,
    }

    console.log("✅ User stats calculated:", stats)
    res.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error("❌ Error fetching user stats:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch user statistics",
      error: error.message,
    })
  }
})

export default router
