import express from "express"
import User from "../models/User.js"
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js"

const router = express.Router()

// POST /api/auth/sync - Sync Firebase user with MongoDB
router.post("/sync", verifyFirebaseToken, async (req, res) => {
  try {
    console.log("🔄 Sync request received")
    console.log("Request body:", req.body)
    console.log("User from token:", req.user)

    const { uid, email, displayName, photoURL, provider } = req.body

    // Find existing user or create new one
    let user = await User.findOne({ uid })

    if (!user) {
      console.log("Creating new user...")
      // Create new user
      user = new User({
        uid,
        email,
        displayName: displayName || email.split("@")[0],
        photoURL: photoURL || "",
        provider: provider || "email",
        isOnline: true,
        lastSeen: new Date(),
        settings: {
          emailNotifications: true,
          quizReminders: false,
          autoSave: true,
          soundEffects: false,
          animationsEnabled: true,
          compactMode: false,
          showScores: true,
          allowAnalytics: true,
          marketingEmails: false,
          weeklyDigest: true,
        },
        privacy: {
          profileVisibility: true,
          leaderboardVisibility: true,
          showEmail: false,
          showLocation: true,
          showAge: false,
          allowDirectMessages: true,
          showOnlineStatus: true,
          showQuizHistory: false,
          allowProfileSearch: true,
          showAchievements: true,
        },
      })
      await user.save()
      console.log("✅ New user created:", user._id)
    } else {
      console.log("Updating existing user...")
      // Update existing user with latest Firebase data
      user.email = email
      user.displayName = displayName || user.displayName
      user.photoURL = photoURL || user.photoURL
      user.provider = provider || user.provider
      user.isOnline = true
      user.lastSeen = new Date()

      // Ensure settings and privacy exist
      if (!user.settings) {
        user.settings = {
          emailNotifications: true,
          quizReminders: false,
          autoSave: true,
          soundEffects: false,
          animationsEnabled: true,
          compactMode: false,
          showScores: true,
          allowAnalytics: true,
          marketingEmails: false,
          weeklyDigest: true,
        }
      }

      if (!user.privacy) {
        user.privacy = {
          profileVisibility: true,
          leaderboardVisibility: true,
          showEmail: false,
          showLocation: true,
          showAge: false,
          allowDirectMessages: true,
          showOnlineStatus: true,
          showQuizHistory: false,
          allowProfileSearch: true,
          showAchievements: true,
        }
      }

      await user.save()
      console.log("✅ User updated:", user._id)
    }

    res.json({
      success: true,
      profile: user,
    })
  } catch (error) {
    console.error("❌ Sync error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to sync user data",
      error: error.message,
    })
  }
})

// POST /api/auth/register - Register new user with email
router.post("/register", verifyFirebaseToken, async (req, res) => {
  try {
    console.log("🔄 Register request received")
    console.log("Request body:", req.body)
    console.log("User from token:", req.user)

    const { uid, email, displayName, age, location, photoURL } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ uid }, { email }],
    })

    if (existingUser) {
      if (existingUser.uid === uid) {
        console.log("User exists, updating profile...")
        // User exists, update profile
        if (displayName) existingUser.displayName = displayName
        if (age !== undefined) existingUser.age = age
        if (location) existingUser.location = location
        if (photoURL) existingUser.photoURL = photoURL
        existingUser.isOnline = true
        existingUser.lastSeen = new Date()

        await existingUser.save()

        return res.json({
          success: true,
          profile: existingUser,
        })
      } else {
        console.log("❌ Email already taken")
        return res.status(400).json({
          success: false,
          message: "Email already taken",
        })
      }
    }

    console.log("Creating new user...")
    // Create new user
    const newUser = new User({
      uid,
      email,
      displayName: displayName || email.split("@")[0],
      age: age || undefined,
      location: location || "",
      photoURL: photoURL || "",
      provider: "email",
      isOnline: true,
      lastSeen: new Date(),
    })

    await newUser.save()
    console.log("✅ New user registered:", newUser._id)

    res.json({
      success: true,
      profile: newUser,
    })
  } catch (error) {
    console.error("❌ Registration error:", error)

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      })
    }

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to create user profile",
      error: error.message,
    })
  }
})

// PUT /api/auth/profile - Update user profile
router.put("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    console.log("🔄 Profile update request received")
    console.log("User UID from token:", req.user?.uid)
    console.log("Request body:", req.body)

    const uid = req.user?.uid
    if (!uid) {
      console.log("❌ No UID found in request")
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    const updates = { ...req.body }

    // Don't allow updating certain fields
    delete updates.uid
    delete updates.email
    delete updates.createdAt
    delete updates.updatedAt
    delete updates._id
    delete updates.__v

    console.log("Sanitized updates:", updates)

    // Validate displayName
    if (updates.displayName !== undefined) {
      if (!updates.displayName || updates.displayName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Display name cannot be empty",
        })
      }
      updates.displayName = updates.displayName.trim()
    }

    // Validate age if provided
    if (updates.age !== undefined && updates.age !== null && updates.age !== "") {
      const age = Number(updates.age)
      if (isNaN(age) || age < 13 || age > 120) {
        return res.status(400).json({
          success: false,
          message: "Age must be between 13 and 120",
        })
      }
      updates.age = age
    } else if (updates.age === "" || updates.age === null) {
      updates.age = undefined
    }

    // Validate location
    if (updates.location !== undefined) {
      updates.location = updates.location.trim()
    }

    // Validate photoURL
    if (updates.photoURL !== undefined) {
      updates.photoURL = updates.photoURL.trim()
    }

    // Handle settings updates
    if (updates.settings) {
      console.log("Updating settings:", updates.settings)
    }

    // Handle privacy updates
    if (updates.privacy) {
      console.log("Updating privacy:", updates.privacy)
    }

    // Validate bio, website, phone, birthDate
    if (updates.bio !== undefined) {
      updates.bio = updates.bio.trim()
    }

    if (updates.website !== undefined) {
      updates.website = updates.website.trim()
    }

    if (updates.phone !== undefined) {
      updates.phone = updates.phone.trim()
    }

    if (updates.birthDate !== undefined) {
      updates.birthDate = updates.birthDate.trim()
    }

    console.log("Final updates to apply:", updates)

    // Find user
    const user = await User.findOne({ uid })
    if (!user) {
      console.log("❌ User not found for UID:", uid)
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    console.log("Found user before update:", {
      id: user._id,
      displayName: user.displayName,
      age: user.age,
      location: user.location,
    })

    // Apply updates one by one
    if (updates.displayName !== undefined) user.displayName = updates.displayName
    if (updates.photoURL !== undefined) user.photoURL = updates.photoURL
    if (updates.age !== undefined) user.age = updates.age
    if (updates.location !== undefined) user.location = updates.location
    if (updates.bio !== undefined) user.bio = updates.bio
    if (updates.website !== undefined) user.website = updates.website
    if (updates.phone !== undefined) user.phone = updates.phone
    if (updates.birthDate !== undefined) user.birthDate = updates.birthDate

    // Handle settings and privacy updates
    if (updates.settings) {
      user.settings = { ...user.settings.toObject(), ...updates.settings }
    }

    if (updates.privacy) {
      user.privacy = { ...user.privacy.toObject(), ...updates.privacy }
    }

    console.log("User after applying updates:", {
      id: user._id,
      displayName: user.displayName,
      age: user.age,
      location: user.location,
    })

    // Save the user
    const savedUser = await user.save()
    console.log("✅ Profile updated successfully:", savedUser._id)

    res.json({
      success: true,
      profile: savedUser,
      message: "Profile updated successfully",
    })
  } catch (error) {
    console.error("❌ Profile update error:", error)
    console.error("Error stack:", error.stack)

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      })
    }

    if (error.name === "ValidationError") {
      console.error("Validation errors:", error.errors)
      const validationErrors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      })
    }

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
})

// GET /api/auth/profile - Get user profile
router.get("/profile", verifyFirebaseToken, async (req, res) => {
  try {
    console.log("🔄 Get profile request received")
    console.log("User UID from token:", req.user?.uid)

    const uid = req.user?.uid
    if (!uid) {
      console.log("❌ No UID found in request")
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    const user = await User.findOne({ uid })

    if (!user) {
      console.log("❌ User profile not found for UID:", uid)
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
    console.error("❌ Get profile error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
      error: error.message,
    })
  }
})

// PUT /api/auth/online-status - Update online status
router.put("/online-status", verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.user?.uid
    const { isOnline } = req.body

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    const user = await User.findOne({ uid })
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    user.isOnline = isOnline
    user.lastSeen = new Date()
    await user.save()

    res.json({
      success: true,
      message: "Online status updated",
    })
  } catch (error) {
    console.error("❌ Update online status error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update online status",
      error: error.message,
    })
  }
})

export default router
