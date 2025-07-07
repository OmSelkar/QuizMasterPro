// Middleware to filter user data based on privacy settings

export const privacyFilter = (userProfile, viewerUserId) => {
  if (!userProfile) return null

  // If viewing own profile, return everything
  if (viewerUserId === userProfile.firebaseUid) {
    return userProfile
  }

  // Create filtered profile based on privacy settings
  const filteredProfile = {
    firebaseUid: userProfile.firebaseUid,
    displayName: userProfile.displayName,
    photoURL: userProfile.photoURL,
    createdAt: userProfile.createdAt,
    provider: userProfile.provider,
    privacy: userProfile.privacy,
  }

  // Apply privacy filters
  if (userProfile.privacy?.profileVisibility === false) {
    // If profile is completely private, return minimal info
    return {
      firebaseUid: userProfile.firebaseUid,
      displayName: userProfile.displayName,
      photoURL: userProfile.photoURL,
      privacy: { profileVisibility: false },
    }
  }

  // Add fields based on privacy settings
  if (userProfile.privacy?.showEmail !== false) {
    filteredProfile.email = userProfile.email
  }

  if (userProfile.privacy?.showLocation !== false) {
    filteredProfile.location = userProfile.location
  }

  if (userProfile.privacy?.showAge !== false) {
    filteredProfile.age = userProfile.age
  }

  if (userProfile.privacy?.showOnlineStatus !== false) {
    filteredProfile.isOnline = userProfile.isOnline
    filteredProfile.lastSeen = userProfile.lastSeen
  }

  if (userProfile.privacy?.showQuizHistory !== false) {
    filteredProfile.showQuizHistory = true
  }

  // Always include these if they exist
  if (userProfile.bio) filteredProfile.bio = userProfile.bio
  if (userProfile.website) filteredProfile.website = userProfile.website
  if (userProfile.phone) filteredProfile.phone = userProfile.phone

  return filteredProfile
}

export function filterLeaderboardData(attempts, viewerUserId = null) {
  return attempts.map((attempt) => {
    const isOwnAttempt = viewerUserId && attempt.userId === viewerUserId

    if (isOwnAttempt) {
      return attempt
    }

    // For other users' attempts, check their privacy settings
    return {
      ...attempt,
      userName: attempt.privacy?.leaderboardVisibility !== false ? attempt.userName : "Anonymous User",
    }
  })
}
