"use client"

import { useState, useEffect, useContext } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Mail,
  Calendar,
  Trophy,
  Target,
  Clock,
  Activity,
  CheckCircle,
  Plus,
  MapPin,
  Globe,
  AlertCircle,
  Loader2,
  Github,
  Linkedin,
  Twitter,
  Briefcase,
  GraduationCap,
  Tag,
  Heart,
  ExternalLink,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { AppContext } from "../context/AppContext"
import axios from "axios"

export default function UserProfileModal({ userId, isOpen, onClose }) {
  const { user: currentUser } = useAuth()
  const { backendUrl } = useContext(AppContext)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && userId) {
      console.log(`🔍 UserProfileModal opened for userId: ${userId}`)
      fetchUserProfile(userId)
    } else if (!isOpen) {
      // Reset state when modal closes
      setProfile(null)
      setError(null)
    }
  }, [isOpen, userId])

  const fetchUserProfile = async (targetUserId) => {
    try {
      setLoading(true)
      setError(null)
      setProfile(null)

      // Check if it's the current user's profile
      const isOwnProfile = currentUser && (currentUser.uid === targetUserId || currentUser.authId === targetUserId)
      console.log(`🔍 Fetching profile for userId: ${targetUserId}, isOwnProfile: ${isOwnProfile}`)

      let response

      if (isOwnProfile) {
        console.log(`📱 Fetching own profile performance data`)
        const token = currentUser.authType === "firebase" 
          ? await currentUser.getIdToken?.() 
          : localStorage.getItem("jwt_token")
        
        if (!token) {
          throw new Error("Authentication token not available")
        }

        response = await axios.get(`${backendUrl}/api/users/profile/performance`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } else {
        console.log(`🌐 Fetching public profile for: ${targetUserId}`)
        response = await axios.get(`${backendUrl}/api/users/${targetUserId}/public-profile`)
      }

      console.log(`📊 Profile API Response:`, response.data)

      if (response.data && response.data.success) {
        const { profile: userProfile, stats, recentAttempts } = response.data

        // Map the data to the format expected by the component
        const mappedProfile = {
          uid: userProfile.uid || userProfile.authId,
          authId: userProfile.authId || userProfile.uid,
          authType: userProfile.authType || "firebase",
          name: userProfile.name || userProfile.displayName || "Anonymous User",
          displayName: userProfile.displayName || userProfile.name,
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
          isOnline: userProfile.isOnline || false,
          lastSeen: userProfile.lastSeen,
          onlineStatus: userProfile.onlineStatus,
          joinedDate: userProfile.joinedDate || userProfile.createdAt,
          provider: userProfile.provider || "email",
          isOwnProfile: isOwnProfile,
          privacy: userProfile.privacy || {},
          stats: {
            totalQuizzes: stats?.totalQuizzes || stats?.totalAttempts || 0,
            quizzesCreated: stats?.quizzesCreated || stats?.totalQuizzesCreated || 0,
            perfectScores: stats?.perfectScores || 0,
            totalTimeSpent: stats?.totalTimeSpent || 0,
            totalAttempts: stats?.totalAttempts || stats?.totalQuizzes || 0,
          },
          recentAttempts: (recentAttempts || []).map((attempt) => ({
            id: attempt.id,
            quizTitle: attempt.quizTitle || "Unknown Quiz",
            score: attempt.score || 0,
            maxPossibleScore: attempt.maxPossibleScore || attempt.totalPoints || 1,
            completedAt: attempt.completedAt,
            timeTaken: attempt.timeTaken || 0,
          })),
        }

        console.log("📊 Mapped profile data:", mappedProfile)
        setProfile(mappedProfile)
      } else {
        throw new Error(response.data?.message || "Failed to fetch profile")
      }
    } catch (err) {
      console.error("❌ Profile fetch error:", err)
      const errorMessage = err.response?.data?.message || err.message || "Failed to load profile. Please try again."
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch (error) {
      return "Unknown"
    }
  }

  const getOnlineStatusDisplay = () => {
    if (!profile) return { text: "Unknown", color: "bg-gray-400" }

    if (profile.onlineStatus) {
      return {
        text: profile.onlineStatus.text,
        color: profile.onlineStatus.color,
      }
    }

    if (profile.isOnline) {
      return { text: "Online", color: "bg-green-500" }
    } else if (profile.lastSeen) {
      const lastSeenDate = new Date(profile.lastSeen)
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

  const getInitials = (name) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return "0s"

    // Handle both seconds and milliseconds
    const timeInSeconds = seconds > 10000 ? Math.round(seconds / 1000) : seconds

    if (timeInSeconds < 60) {
      return `${timeInSeconds}s`
    } else if (timeInSeconds < 3600) {
      const mins = Math.floor(timeInSeconds / 60)
      const secs = timeInSeconds % 60
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
    } else {
      const hours = Math.floor(timeInSeconds / 3600)
      const mins = Math.floor((timeInSeconds % 3600) / 60)
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
  }

  const getSocialIcon = (platform) => {
    switch (platform) {
      case "github":
        return <Github className="h-4 w-4" />
      case "linkedin":
        return <Linkedin className="h-4 w-4" />
      case "twitter":
        return <Twitter className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  const renderSocialLinks = () => {
    const socialLinks = []

    if (profile.website) {
      socialLinks.push({
        platform: "website",
        url: profile.website.startsWith("http") ? profile.website : `https://${profile.website}`,
        label: "Website",
      })
    }

    if (profile.github) {
      socialLinks.push({
        platform: "github",
        url: profile.github.startsWith("http") ? profile.github : `https://github.com/${profile.github}`,
        label: "GitHub",
      })
    }

    if (profile.linkedin) {
      socialLinks.push({
        platform: "linkedin",
        url: profile.linkedin.startsWith("http") ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`,
        label: "LinkedIn",
      })
    }

    if (profile.twitter) {
      socialLinks.push({
        platform: "twitter",
        url: profile.twitter.startsWith("http") ? profile.twitter : `https://twitter.com/${profile.twitter}`,
        label: "Twitter",
      })
    }

    if (socialLinks.length === 0) return null

    return (
      <div className="flex flex-wrap gap-2">
        {socialLinks.map((link, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="h-8 bg-transparent"
            onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
          >
            {getSocialIcon(link.platform)}
            <span className="ml-1">{link.label}</span>
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        ))}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {loading ? "Loading Profile..." : profile?.name || "User Profile"}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Fetching user profile information..."
              : "View detailed user profile information and quiz statistics."}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3">Loading profile...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Profile Not Available</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => fetchUserProfile(userId)} variant="outline">
                Try Again
              </Button>
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && profile && (
          <div className="space-y-6">
            {/* Enhanced Profile Header */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg">
              <div className="flex items-start space-x-4">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                    <AvatarImage src={profile.photoURL || "/placeholder.svg"} alt={profile.displayName} />
                    <AvatarFallback className="text-lg font-semibold">
                      {getInitials(profile.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  {profile.isOnline !== undefined && (
                    <div
                      className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${
                        getOnlineStatusDisplay().color
                      }`}
                      title={getOnlineStatusDisplay().text || "Unknown"}
                    />
                  )}
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900">{profile.displayName || "Anonymous User"}</h2>

                  {profile.bio && <p className="text-gray-600 mt-2">{profile.bio}</p>}

                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="text-xs">
                      {profile.authType === "firebase" ? "Firebase" : "Local"} User
                    </Badge>

                    {profile.provider && (
                      <Badge variant="outline" className="text-xs">
                        {profile.provider}
                      </Badge>
                    )}

                    {profile.isOnline !== undefined && (
                      <Badge
                        variant={getOnlineStatusDisplay().text === "Online" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        <Activity className="h-3 w-3 mr-1" />
                        {getOnlineStatusDisplay().text}
                      </Badge>
                    )}

                    {profile.isOwnProfile && (
                      <Badge variant="outline" className="text-xs">
                        Your Profile
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.email && profile.privacy?.showEmail !== false && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{profile.email}</span>
                </div>
              )}

              {profile.location && profile.privacy?.showLocation !== false && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}

              {profile.age && profile.privacy?.showAge !== false && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{profile.age} years old</span>
                </div>
              )}

              {profile.joinedDate && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Joined {formatDate(profile.joinedDate)}</span>
                </div>
              )}
            </div>

            {/* Professional Info */}
            {(profile.occupation || profile.education) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-muted-foreground">
                {profile.occupation && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span className="text-sm">{profile.occupation}</span>
                  </div>
                )}
                {profile.education && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span className="text-sm">{profile.education}</span>
                  </div>
                )}
              </div>
            )}

            {/* Social Links */}
            {profile.privacy?.showSocialLinks !== false && renderSocialLinks()}

            {/* Skills and Interests */}
            {(profile.skills?.length > 0 || profile.interests?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {profile.skills?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Tag className="h-5 w-5" />
                        Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {profile.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {profile.interests?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Heart className="h-5 w-5" />
                        Interests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Enhanced Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{profile.stats.totalQuizzes}</div>
                  <div className="text-xs text-muted-foreground">Quizzes Taken</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Plus className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{profile.stats.quizzesCreated}</div>
                  <div className="text-xs text-muted-foreground">Quizzes Created</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{profile.stats.perfectScores}</div>
                  <div className="text-xs text-muted-foreground">Perfect Scores</div>
                </CardContent>
              </Card>
            </div>

            {/* Time Spent Card */}
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-6 w-6 text-indigo-500 mx-auto mb-2" />
                  <div className="text-xl font-bold">{formatTime(profile.stats.totalTimeSpent)}</div>
                  <div className="text-xs text-muted-foreground">Total Time Spent</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Quiz Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Recent Quiz Activity
                  {profile.recentAttempts?.length > 0 && (
                    <Badge variant="outline" className="ml-auto">
                      {profile.recentAttempts.length} recent
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.recentAttempts && profile.recentAttempts.length > 0 ? (
                  <div className="space-y-3">
                    {profile.recentAttempts.slice(0, 5).map((attempt, index) => {
                      const maxScore = Math.max(attempt.maxPossibleScore || 1, 1)
                      const score = attempt.score || 0
                      const percentage = Math.min(Math.round((score / maxScore) * 100), 100)

                      return (
                        <div
                          key={`${attempt.id}-${index}`}
                          className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-lg">{attempt.quizTitle}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(attempt.completedAt)}
                              </span>
                              {attempt.timeTaken > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(attempt.timeTaken)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <Badge variant="outline" className="text-sm">
                                {score}/{maxScore}
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">{percentage}% Score</div>
                            </div>
                            {score === maxScore ? (
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-xs font-bold">{percentage}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No quiz activity found.</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.isOwnProfile ? "You haven't" : "This user hasn't"} completed any quizzes yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              {profile.isOwnProfile && (
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log("Edit profile clicked")
                    // TODO: Navigate to profile edit page
                  }}
                >
                  Edit Profile
                </Button>
              )}
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && !profile && (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Profile Data</h3>
            <p className="text-muted-foreground mb-4">Unable to load profile information.</p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}