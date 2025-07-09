import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    // CHANGED: Unified identifier for both Firebase and JWT users
    authId: {
      type: String,
      required: true,
      index: true,
    },
    // NEW: Authentication type to distinguish between Firebase and JWT users
    authType: {
      type: String,
      enum: ["firebase", "jwt"],
      default: "firebase",
      required: true,
    },
    // For JWT users only - password hash
    passwordHash: {
      type: String,
      required: function() {
        return this.authType === "jwt"
      },
    },
    // For JWT users only - username (unique within JWT users)
    username: {
      type: String,
      sparse: true,
      validate: {
        validator: function(v) {
          // Username required only for JWT users
          if (this.authType === "jwt") {
            return v && v.trim().length > 0
          }
          return true
        },
        message: "Username is required for JWT users"
      }
    },
    email: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^\S+@\S+\.\S+$/.test(v)
        },
        message: "Invalid email format"
      }
    },
    displayName: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 100,
    },
    photoURL: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    location: {
      type: String,
      default: "",
      maxlength: 100,
    },
    website: {
      type: String,
      default: "",
    },
    linkedin: {
      type: String,
      default: "",
    },
    github: {
      type: String,
      default: "",
    },
    twitter: {
      type: String,
      default: "",
    },
    age: {
      type: Number,
      min: 13,
      max: 120,
    },
    skills: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
    occupation: {
      type: String,
      default: "",
    },
    education: {
      type: String,
      default: "",
    },
    provider: {
      type: String,
      default: function() {
        return this.authType === "firebase" ? "firebase" : "email"
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    // Privacy Settings
    privacy: {
      profileVisibility: {
        type: Boolean,
        default: true,
      },
      leaderboardVisibility: {
        type: Boolean,
        default: true,
      },
      showEmail: {
        type: Boolean,
        default: false,
      },
      showLocation: {
        type: Boolean,
        default: true,
      },
      showAge: {
        type: Boolean,
        default: false,
      },
      showOnlineStatus: {
        type: Boolean,
        default: true,
      },
      showQuizHistory: {
        type: Boolean,
        default: true,
      },
      showStats: {
        type: Boolean,
        default: true,
      },
      showSocialLinks: {
        type: Boolean,
        default: true,
      },
      allowProfileViewing: {
        type: Boolean,
        default: true,
      },
    },
    // User Settings
    settings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      quizReminders: {
        type: Boolean,
        default: false,
      },
      autoSave: {
        type: Boolean,
        default: true,
      },
      soundEffects: {
        type: Boolean,
        default: false,
      },
      animationsEnabled: {
        type: Boolean,
        default: true,
      },
      compactMode: {
        type: Boolean,
        default: false,
      },
      showScores: {
        type: Boolean,
        default: true,
      },
      allowAnalytics: {
        type: Boolean,
        default: true,
      },
      marketingEmails: {
        type: Boolean,
        default: false,
      },
      weeklyDigest: {
        type: Boolean,
        default: true,
      },
    },
    // User Statistics (cached for performance)
    stats: {
      totalQuizzesTaken: {
        type: Number,
        default: 0,
      },
      totalQuizzesCreated: {
        type: Number,
        default: 0,
      },
      perfectScores: {
        type: Number,
        default: 0,
      },
      totalScore: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
      },
      bestScore: {
        type: Number,
        default: 0,
      },
      totalTimeSpent: {
        type: Number,
        default: 0,
      },
      successRate: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Compound index for authId and authType
userSchema.index({ authId: 1, authType: 1 }, { unique: true })

// Sparse index on email - enforces uniqueness for non-null values
userSchema.index({ email: 1 }, { sparse: true, unique: true })

// Sparse index on username for JWT users
userSchema.index({ username: 1, authType: 1 }, { 
  sparse: true, 
  unique: true,
  partialFilterExpression: { authType: "jwt" }
})

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return this.displayName || this.email?.split("@")[0] || "Anonymous User"
})

// Method to check if user is currently online
userSchema.methods.isCurrentlyOnline = function () {
  if (!this.isOnline || !this.lastSeen) return false
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  return this.lastSeen > fiveMinutesAgo
}

// Method to get user's online status
userSchema.methods.getOnlineStatus = function () {
  if (!this.lastSeen) {
    return { text: "Unknown", color: "bg-gray-400" }
  }

  const now = new Date()
  const lastSeenDate = new Date(this.lastSeen)
  const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60))

  if (this.isOnline && diffInMinutes < 5) {
    return { text: "Online", color: "bg-green-500" }
  } else if (diffInMinutes < 5) {
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

// Method to check if user should be visible on leaderboards
userSchema.methods.isVisibleOnLeaderboard = function () {
  if (!this.privacy?.profileVisibility) {
    return false
  }

  if (this.privacy?.leaderboardVisibility === false) {
    return false
  }

  return true
}

// Method to get leaderboard display data
userSchema.methods.getLeaderboardData = function (isOwnData = false) {
  if (isOwnData) {
    return {
      userName: this.displayName || "Anonymous",
      userPhotoURL: this.photoURL || "/placeholder.svg?height=40&width=40",
      userEmail: this.email || "",
      userId: this.authId,
    }
  }

  if (!this.isVisibleOnLeaderboard()) {
    return {
      userName: "Anonymous User",
      userPhotoURL: "/placeholder.svg?height=40&width=40",
      userEmail: "",
      userId: "anonymous",
    }
  }

  return {
    userName: this.displayName || "Anonymous",
    userPhotoURL: this.photoURL || "/placeholder.svg?height=40&width=40",
    userEmail: this.privacy?.showEmail ? this.email || "" : "",
    userId: this.authId,
  }
}

// Method to get public profile based on privacy settings
userSchema.methods.getPublicProfile = function (isOwnProfile = false) {
  const profile = {
    uid: this.authId,
    authId: this.authId,
    authType: this.authType,
    displayName: this.displayName,
    photoURL: this.photoURL,
    createdAt: this.createdAt,
    provider: this.provider,
  }

  if (isOwnProfile) {
    return {
      ...profile,
      email: this.email,
      bio: this.bio,
      location: this.location,
      website: this.website,
      linkedin: this.linkedin,
      github: this.github,
      twitter: this.twitter,
      age: this.age,
      skills: this.skills,
      interests: this.interests,
      occupation: this.occupation,
      education: this.education,
      privacy: this.privacy,
      settings: this.settings,
      stats: this.stats,
      username: this.username, // Include username for JWT users
    }
  }

  if (!this.privacy?.profileVisibility || !this.privacy?.allowProfileViewing) {
    return {
      uid: this.authId,
      authId: this.authId,
      authType: this.authType,
      displayName: this.displayName,
      photoURL: this.photoURL,
      privacy: { profileVisibility: false },
    }
  }

  // Add fields based on privacy settings
  if (this.privacy?.showEmail) {
    profile.email = this.email
  }

  if (this.privacy?.showLocation) {
    profile.location = this.location
  }

  if (this.privacy?.showAge) {
    profile.age = this.age
  }

  if (this.privacy?.showSocialLinks) {
    profile.website = this.website
    profile.linkedin = this.linkedin
    profile.github = this.github
    profile.twitter = this.twitter
  }

  // Always show bio if it exists
  if (this.bio) {
    profile.bio = this.bio
  }

  // Always show skills and interests if they exist
  if (this.skills && this.skills.length > 0) {
    profile.skills = this.skills
  }

  if (this.interests && this.interests.length > 0) {
    profile.interests = this.interests
  }

  if (this.occupation) {
    profile.occupation = this.occupation
  }

  if (this.education) {
    profile.education = this.education
  }

  return profile
}

// Pre-save middleware to update stats
userSchema.pre("save", function (next) {
  if (this.isModified("isOnline") || this.isModified("lastSeen")) {
    this.lastSeen = new Date()
  }
  next()
})

const User = mongoose.model("User", userSchema)

export default User