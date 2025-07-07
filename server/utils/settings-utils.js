// Utility functions for handling user settings

export const applyUserSettings = (settings) => {
  if (typeof window === "undefined") return // Server-side guard

  // Apply animation settings
  if (settings.animationsEnabled !== undefined) {
    document.documentElement.style.setProperty("--animation-duration", settings.animationsEnabled ? "0.2s" : "0s")
  }

  // Apply compact mode
  if (settings.compactMode !== undefined) {
    document.documentElement.classList.toggle("compact-mode", settings.compactMode)
  }

  // Store settings in data attributes for CSS targeting
  document.documentElement.setAttribute("data-settings", JSON.stringify(settings))
}

export const applyPrivacySettings = (privacy) => {
  if (typeof window === "undefined") return // Server-side guard

  // Store privacy settings in data attributes for CSS targeting
  document.documentElement.setAttribute("data-privacy", JSON.stringify(privacy))
}

export const getDefaultSettings = () => ({
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
})

export const getDefaultPrivacy = () => ({
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
})

export const shouldShowUserInfo = (privacy, field, isOwnProfile = false) => {
  if (isOwnProfile) return true

  switch (field) {
    case "email":
      return privacy.showEmail
    case "location":
      return privacy.showLocation
    case "age":
      return privacy.showAge
    case "profile":
      return privacy.profileVisibility
    case "leaderboard":
      return privacy.leaderboardVisibility
    case "quizHistory":
      return privacy.showQuizHistory
    case "achievements":
      return privacy.showAchievements
    default:
      return true
  }
}
