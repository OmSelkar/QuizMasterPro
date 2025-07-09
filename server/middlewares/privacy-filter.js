// ENHANCED: Improved privacy filter middleware to properly respect user settings
import User from "../models/User.js"

export const privacyFilter = async (userProfile, viewerAuthId = null) => {
  if (!userProfile) return null

  // If viewing own profile, return everything
  if (viewerAuthId === userProfile.authId) {
    return userProfile
  }

  // Create filtered profile based on privacy settings
  const filteredProfile = {
    authId: userProfile.authId,
    authType: userProfile.authType,
    displayName: userProfile.displayName,
    photoURL: userProfile.photoURL,
    createdAt: userProfile.createdAt,
    provider: userProfile.provider,
    privacy: userProfile.privacy,
  }

  // ENHANCED: Check for private profile first
  if (!userProfile.privacy?.profileVisibility || !userProfile.privacy?.allowProfileViewing) {
    // If profile is completely private, return minimal info
    return {
      authId: userProfile.authId,
      authType: userProfile.authType,
      displayName: userProfile.displayName,
      photoURL: userProfile.photoURL,
      privacy: { profileVisibility: false },
    }
  }

  // ENHANCED: Add fields based on privacy settings with proper defaults
  if (userProfile.privacy?.showEmail) {
    filteredProfile.email = userProfile.email
  }

  if (userProfile.privacy?.showLocation) {
    filteredProfile.location = userProfile.location
  }

  if (userProfile.privacy?.showAge) {
    filteredProfile.age = userProfile.age
  }

  if (userProfile.privacy?.showOnlineStatus) {
    filteredProfile.isOnline = userProfile.isOnline
    filteredProfile.lastSeen = userProfile.lastSeen
  }

  if (userProfile.privacy?.showQuizHistory) {
    filteredProfile.showQuizHistory = true
  }

  if (userProfile.privacy?.showStats) {
    filteredProfile.showStats = true
  }

  if (userProfile.privacy?.showSocialLinks) {
    filteredProfile.website = userProfile.website
    filteredProfile.linkedin = userProfile.linkedin
    filteredProfile.github = userProfile.github
    filteredProfile.twitter = userProfile.twitter
  }

  // ENHANCED: Always include these basic fields if they exist
  if (userProfile.bio) filteredProfile.bio = userProfile.bio
  if (userProfile.skills) filteredProfile.skills = userProfile.skills
  if (userProfile.interests) filteredProfile.interests = userProfile.interests
  if (userProfile.occupation) filteredProfile.occupation = userProfile.occupation
  if (userProfile.education) filteredProfile.education = userProfile.education

  return filteredProfile
}

// ENHANCED: Leaderboard data filtering with database lookup
export async function filterLeaderboardData(attempts, viewerAuthId = null) {
  return await Promise.all(
    attempts.map(async (attempt) => {
      try {
        const isOwnAttempt = viewerAuthId && attempt.userId === viewerAuthId

        if (isOwnAttempt) {
          return {
            ...attempt,
            isCurrentUser: true,
          }
        }

        // Fetch user's privacy settings from database using authId
        const user = await User.findOne({ authId: attempt.userId }).lean()

        if (!user) {
          // User not found, return anonymous data
          return {
            ...attempt,
            userName: "Anonymous User",
            userPhotoURL: "/placeholder.svg?height=40&width=40",
            userEmail: "",
            userId: "anonymous",
            isCurrentUser: false,
          }
        }

        // Check if user should be visible on leaderboard
        const isProfilePrivate = !user.privacy?.profileVisibility
        const hideFromLeaderboard = user.privacy?.leaderboardVisibility === false
        const disallowProfileViewing = !user.privacy?.allowProfileViewing

        if (isProfilePrivate || hideFromLeaderboard || disallowProfileViewing) {
          return {
            ...attempt,
            userName: "Anonymous User",
            userPhotoURL: "/placeholder.svg?height=40&width=40",
            userEmail: "",
            userId: "anonymous",
            isCurrentUser: false,
          }
        }

        // Return public data with privacy filters applied
        return {
          ...attempt,
          userName: user.displayName || "Anonymous User",
          userPhotoURL: user.photoURL || "/placeholder.svg?height=40&width=40",
          userEmail: user.privacy?.showEmail ? user.email || "" : "",
          userId: user.authId,
          isCurrentUser: false,
        }
      } catch (error) {
        console.error(`Error filtering leaderboard data for user ${attempt.userId}:`, error)
        // Return safe defaults on error
        return {
          ...attempt,
          userName: "Anonymous User",
          userPhotoURL: "/placeholder.svg?height=40&width=40",
          userEmail: "",
          userId: "anonymous",
          isCurrentUser: false,
        }
      }
    }),
  )
}

// NEW: Helper function to check if user data should be visible
export async function isUserDataVisible(authId, viewerAuthId = null) {
  try {
    // Own data is always visible
    if (authId === viewerAuthId) {
      return true
    }

    const user = await User.findOne({ authId }).lean()
    if (!user) {
      return false
    }

    // Check privacy settings
    if (!user.privacy?.profileVisibility) {
      return false
    }

    if (user.privacy?.leaderboardVisibility === false) {
      return false
    }

    if (!user.privacy?.allowProfileViewing) {
      return false
    }

    return true
  } catch (error) {
    console.error(`Error checking user data visibility for ${authId}:`, error)
    return false
  }
}

// NEW: Get safe user display data for leaderboards
export async function getSafeUserDisplayData(authId, viewerAuthId = null) {
  try {
    const isVisible = await isUserDataVisible(authId, viewerAuthId)

    if (!isVisible) {
      return {
        userName: "Anonymous User",
        userPhotoURL: "/placeholder.svg?height=40&width=40",
        userEmail: "",
        userId: "anonymous",
      }
    }

    const user = await User.findOne({ authId }).lean()
    if (!user) {
      return {
        userName: "Anonymous User",
        userPhotoURL: "/placeholder.svg?height=40&width=40",
        userEmail: "",
        userId: "anonymous",
      }
    }

    return {
      userName: user.displayName || "Anonymous User",
      userPhotoURL: user.photoURL || "/placeholder.svg?height=40&width=40",
      userEmail: user.privacy?.showEmail ? user.email || "" : "",
      userId: user.authId,
    }
  } catch (error) {
    console.error(`Error getting safe user display data for ${authId}:`, error)
    return {
      userName: "Anonymous User",
      userPhotoURL: "/placeholder.svg?height=40&width=40",
      userEmail: "",
      userId: "anonymous",
    }
  }
}