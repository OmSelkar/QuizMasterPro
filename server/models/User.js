import mongoose from "mongoose"

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      // unique: true,
    },
    email: {
      type: String,
      required: false,
      // REMOVED unique: true constraint to allow multiple users with null email
      // sparse: true,
    },
    displayName: {
      type: String,
      required: false,
    },
    photoURL: {
      type: String,
      required: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    bio: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    profileVisibility: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    // Settings object
    settings: {
      emailNotifications: { type: Boolean, default: true },
      quizReminders: { type: Boolean, default: false },
      autoSave: { type: Boolean, default: true },
      soundEffects: { type: Boolean, default: false },
      animationsEnabled: { type: Boolean, default: true },
      compactMode: { type: Boolean, default: false },
      showScores: { type: Boolean, default: true },
      allowAnalytics: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false },
      weeklyDigest: { type: Boolean, default: true },
    },
    // Privacy object - MADE PROFILES VISIBLE BY DEFAULT
    privacy: {
      profileVisibility: { type: Boolean, default: true },
      leaderboardVisibility: { type: Boolean, default: true },
      showEmail: { type: Boolean, default: false },
      showLocation: { type: Boolean, default: true },
      showAge: { type: Boolean, default: true },
      allowDirectMessages: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
      showQuizHistory: { type: Boolean, default: true },
      allowProfileSearch: { type: Boolean, default: true },
      showAchievements: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  },
)

// Update the updatedAt field before saving
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

// Index for efficient queries
userSchema.index({ firebaseUid: 1 })
userSchema.index({ isOnline: 1, lastSeen: -1 })
// Sparse index on email - only enforces uniqueness for non-null values
userSchema.index({ email: 1 }, { sparse: true, unique: true })

const User = mongoose.model("User", userSchema)

export default User
