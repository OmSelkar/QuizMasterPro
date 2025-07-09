import express from "express"
import User from "../models/User.js"
import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js"
import { unifiedAuth } from "../middlewares/unifiedAuth.js"
import { 
  validateRegistration, 
  validateLogin, 
  generateJWT, 
  hashPassword, 
  comparePassword 
} from "../middlewares/authMiddleware.js"
import admin from "firebase-admin"

const router = express.Router()

// POST /api/auth/sync - Sync Firebase user with MongoDB
router.post("/sync", verifyFirebaseToken, async (req, res) => {
  try {
    console.log("🔄 Sync request received")
    console.log("Request body:", req.body)
    console.log("User from token:", req.user)

    const { uid, email, displayName, photoURL, provider } = req.body

    // Find existing user or create new one
    let user = await User.findOne({ authId: uid, authType: "firebase" })

    if (!user) {
      console.log("Creating new Firebase user...")
      // Create new user
      user = new User({
        authId: uid,
        authType: "firebase",
        email,
        displayName: displayName || email.split("@")[0],
        photoURL: photoURL || "",
        provider: provider || "firebase",
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
      console.log("✅ New Firebase user created:", user._id)
    } else {
      console.log("Updating existing Firebase user...")
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
      console.log("✅ Firebase user updated:", user._id)
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

// POST /api/auth/register - Register new user (Firebase or JWT)
router.post("/register", async (req, res) => {
  try {
    const { authType, ...userData } = req.body
    
    if (authType === "firebase") {
      // Handle Firebase registration (existing logic)
      return handleFirebaseRegistration(req, res)
    } else {
      // Handle JWT registration (new logic)
      return handleJWTRegistration(req, res)
    }
  } catch (error) {
    console.error("❌ Registration error:", error)
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    })
  }
})

// Handle Firebase registration
async function handleFirebaseRegistration(req, res) {
  // Verify Firebase token first
  await verifyFirebaseToken(req, res, async () => {
    try {
      console.log("🔄 Firebase register request received")
      console.log("Request body:", req.body)
      console.log("User from token:", req.user)

      const { uid, email, displayName, age, location, photoURL } = req.body

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { authId: uid, authType: "firebase" },
          { email }
        ],
      })

      if (existingUser) {
        if (existingUser.authId === uid && existingUser.authType === "firebase") {
          console.log("Firebase user exists, updating profile...")
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

      console.log("Creating new Firebase user...")
      // Create new user
      const newUser = new User({
        authId: uid,
        authType: "firebase",
        email,
        displayName: displayName || email.split("@")[0],
        age: age || undefined,
        location: location || "",
        photoURL: photoURL || "",
        provider: "firebase",
        isOnline: true,
        lastSeen: new Date(),
      })

      await newUser.save()
      console.log("✅ New Firebase user registered:", newUser._id)

      res.json({
        success: true,
        profile: newUser,
      })
    } catch (error) {
      console.error("❌ Firebase registration error:", error)

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
}

// Handle JWT registration
async function handleJWTRegistration(req, res) {
  // Validate registration data
  validateRegistration(req, res, async () => {
    try {
      console.log("🔄 JWT register request received")
      console.log("Request body:", req.body)

      const { username, email, password, displayName, age, location } = req.body

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email },
          { username, authType: "jwt" }
        ],
      })

      if (existingUser) {
        if (existingUser.email === email) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          })
        }
        if (existingUser.username === username && existingUser.authType === "jwt") {
          return res.status(400).json({
            success: false,
            message: "Username already exists",
          })
        }
      }

      console.log("Creating new JWT user...")
      
      // Hash password
      const passwordHash = await hashPassword(password)

      // Create new user
      const newUser = new User({
        authType: "jwt",
        username,
        email,
        passwordHash,
        displayName: displayName || username,
        age: age || undefined,
        location: location || "",
        provider: "email",
        isOnline: true,
        lastSeen: new Date(),
      })

      await newUser.save()
      
      // Set authId to the MongoDB _id after saving
      newUser.authId = newUser._id.toString()
      await newUser.save()

      console.log("✅ New JWT user registered:", newUser._id)

      // Generate JWT token
      const token = generateJWT(newUser._id)

      // Remove password hash from response
      const userResponse = newUser.toObject()
      delete userResponse.passwordHash

      res.status(201).json({
        success: true,
        profile: userResponse,
        token,
        message: "User registered successfully",
      })
    } catch (error) {
      console.error("❌ JWT registration error:", error)

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
}

// POST /api/auth/login - Login for JWT users
router.post("/login", validateLogin, async (req, res) => {
  try {
    console.log("🔄 JWT login request received")
    const { identifier, password } = req.body

    // Find user by email or username
    const user = await User.findOne({
      $and: [
        { authType: "jwt" },
        {
          $or: [
            { email: identifier },
            { username: identifier }
          ]
        }
      ]
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.passwordHash)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Update online status
    user.isOnline = true
    user.lastSeen = new Date()
    await user.save()

    // Generate JWT token
    const token = generateJWT(user._id)

    // Remove password hash from response
    const userResponse = user.toObject()
    delete userResponse.passwordHash

    console.log("✅ JWT user logged in:", user._id)

    res.json({
      success: true,
      profile: userResponse,
      token,
      message: "Login successful",
    })
  } catch (error) {
    console.error("❌ JWT login error:", error)
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    })
  }
})

// PUT /api/auth/profile - Update user profile (unified)
router.put("/profile", unifiedAuth, async (req, res) => {
  try {
    console.log("🔄 Profile update request received")
    console.log("User auth from token:", req.auth)
    console.log("Request body:", req.body)

    const { id: authId, type: authType } = req.auth
    if (!authId) {
      console.log("❌ No authId found in request")
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    const updates = { ...req.body }

    // Don't allow updating certain fields
    delete updates.authId
    delete updates.authType
    delete updates.email
    delete updates.passwordHash
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

    // Validate other fields
    if (updates.location !== undefined) {
      updates.location = updates.location.trim()
    }

    if (updates.photoURL !== undefined) {
      updates.photoURL = updates.photoURL.trim()
    }

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
    const user = await User.findOne({ authId, authType })
    if (!user) {
      console.log("❌ User not found for authId:", authId, "authType:", authType)
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
    Object.keys(updates).forEach(key => {
      if (key === 'settings' && updates.settings) {
        user.settings = { ...user.settings.toObject(), ...updates.settings }
      } else if (key === 'privacy' && updates.privacy) {
        user.privacy = { ...user.privacy.toObject(), ...updates.privacy }
      } else {
        user[key] = updates[key]
      }
    })

    console.log("User after applying updates:", {
      id: user._id,
      displayName: user.displayName,
      age: user.age,
      location: user.location,
    })

    // Save the user
    const savedUser = await user.save()
    console.log("✅ Profile updated successfully:", savedUser._id)

    // Remove password hash from response
    const userResponse = savedUser.toObject()
    delete userResponse.passwordHash

    res.json({
      success: true,
      profile: userResponse,
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

// GET /api/auth/profile - Get user profile (unified)
router.get("/profile", unifiedAuth, async (req, res) => {
  try {
    console.log("🔄 Get profile request received")
    console.log("User auth from token:", req.auth)

    const { id: authId, type: authType } = req.auth
    if (!authId) {
      console.log("❌ No authId found in request")
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
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
    console.error("❌ Get profile error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
      error: error.message,
    })
  }
})

// PUT /api/auth/online-status - Update online status (unified)
router.put("/online-status", unifiedAuth, async (req, res) => {
  try {
    const { id: authId, type: authType } = req.auth
    const { isOnline } = req.body

    if (!authId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    const user = await User.findOne({ authId, authType })
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