"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useProfile } from "../context/ProfileContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User,
  Mail,
  Calendar,
  Trophy,
  Target,
  Clock,
  BookOpen,
  Star,
  Award,
  Edit3,
  Save,
  X,
  Camera,
  Settings,
  Activity,
  BarChart3,
} from "lucide-react"

export const UserProfileModal = ({ children, userId = null }) => {
  const { user } = useAuth()
  const { profile, updateProfile, loading } = useProfile()
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState({})
  const [userStats, setUserStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [achievements, setAchievements] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const isOwnProfile = !userId || userId === user?.uid

  useEffect(() => {
    if (isOpen && user) {
      fetchUserStats()
      fetchRecentActivity()
      fetchAchievements()
    }
  }, [isOpen, user])

  useEffect(() => {
    if (profile) {
      setEditedProfile({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        location: profile.location || "",
        website: profile.website || "",
        interests: profile.interests || [],
      })
    }
  }, [profile])

  const fetchUserStats = async () => {
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/users/${userId || user.uid}/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUserStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching user stats:", error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/users/${userId || user.uid}/activity?limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRecentActivity(data.activities)
      }
    } catch (error) {
      console.error("Error fetching recent activity:", error)
    }
  }

  const fetchAchievements = async () => {
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/users/${userId || user.uid}/achievements`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAchievements(data.achievements)
      }
    } catch (error) {
      console.error("Error fetching achievements:", error)
    }
  }

  const handleSave = async () => {
    if (!isOwnProfile) return

    try {
      setSaving(true)
      setError("")

      await updateProfile(editedProfile)
      setIsEditing(false)
    } catch (error) {
      console.error("Error updating profile:", error)
      setError("Failed to update profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedProfile({
      displayName: profile?.displayName || "",
      bio: profile?.bio || "",
      location: profile?.location || "",
      website: profile?.website || "",
      interests: profile?.interests || [],
    })
    setIsEditing(false)
    setError("")
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file || !isOwnProfile) return

    try {
      setSaving(true)
      const formData = new FormData()
      formData.append("avatar", file)

      const token = await user.getIdToken()
      const response = await fetch("/api/users/avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        await updateProfile({ photoURL: data.photoURL })
      } else {
        throw new Error("Failed to upload image")
      }
    } catch (error) {
      console.error("Error uploading avatar:", error)
      setError("Failed to upload image. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case "quiz_created":
        return <BookOpen className="h-4 w-4 text-blue-600" />
      case "quiz_completed":
        return <Target className="h-4 w-4 text-green-600" />
      case "achievement_earned":
        return <Trophy className="h-4 w-4 text-yellow-600" />
      case "high_score":
        return <Star className="h-4 w-4 text-purple-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getAchievementIcon = (type) => {
    switch (type) {
      case "first_quiz":
        return <BookOpen className="h-6 w-6" />
      case "perfect_score":
        return <Star className="h-6 w-6" />
      case "quiz_master":
        return <Trophy className="h-6 w-6" />
      case "speed_demon":
        return <Clock className="h-6 w-6" />
      case "knowledge_seeker":
        return <Target className="h-6 w-6" />
      default:
        return <Award className="h-6 w-6" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isOwnProfile ? "My Profile" : "User Profile"}
          </DialogTitle>
          <DialogDescription>
            {isOwnProfile
              ? "View and edit your profile information, stats, and achievements."
              : "View user profile information and statistics."}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile?.photoURL || "/placeholder.svg"} alt={profile?.displayName} />
                      <AvatarFallback className="text-2xl">
                        {profile?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {isOwnProfile && (
                      <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer hover:bg-primary/90">
                        <Camera className="h-4 w-4" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={saving}
                        />
                      </label>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-2xl font-bold">
                        {profile?.displayName || user?.displayName || "Anonymous User"}
                      </h3>
                      {isOwnProfile && (
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={handleSave} disabled={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? "Saving..." : "Save"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit Profile
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {user?.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Joined {formatDate(profile?.createdAt || user?.metadata?.creationTime)}
                      </div>
                      {profile?.location && (
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          {profile.location}
                        </div>
                      )}
                    </div>

                    {profile?.interests && profile.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {profile.interests.map((interest, index) => (
                          <Badge key={index} variant="secondary">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Details */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={editedProfile.displayName}
                        onChange={(e) => setEditedProfile((prev) => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Enter your display name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={editedProfile.bio}
                        onChange={(e) => setEditedProfile((prev) => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={editedProfile.location}
                          onChange={(e) => setEditedProfile((prev) => ({ ...prev, location: e.target.value }))}
                          placeholder="City, Country"
                        />
                      </div>

                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={editedProfile.website}
                          onChange={(e) => setEditedProfile((prev) => ({ ...prev, website: e.target.value }))}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {profile?.bio && (
                      <div>
                        <h4 className="font-medium mb-2">Bio</h4>
                        <p className="text-muted-foreground">{profile.bio}</p>
                      </div>
                    )}

                    {(profile?.location || profile?.website) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile?.location && (
                          <div>
                            <h4 className="font-medium mb-1">Location</h4>
                            <p className="text-muted-foreground">{profile.location}</p>
                          </div>
                        )}

                        {profile?.website && (
                          <div>
                            <h4 className="font-medium mb-1">Website</h4>
                            <a
                              href={profile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {profile.website}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {!profile?.bio && !profile?.location && !profile?.website && (
                      <p className="text-muted-foreground text-center py-8">
                        {isOwnProfile
                          ? 'Click "Edit Profile" to add more information about yourself.'
                          : "No additional information available."}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            {userStats ? (
              <>
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">{userStats.quizzesCreated}</div>
                        <div className="text-sm text-muted-foreground">Quizzes Created</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Target className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold">{userStats.quizzesCompleted}</div>
                        <div className="text-sm text-muted-foreground">Quizzes Completed</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Star className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                        <div className="text-2xl font-bold">{userStats.averageScore}%</div>
                        <div className="text-sm text-muted-foreground">Average Score</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Trophy className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold">{userStats.perfectScores}</div>
                        <div className="text-sm text-muted-foreground">Perfect Scores</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Detailed Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Total Points Earned:</span>
                          <span className="font-medium">{userStats.totalPoints}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Best Score:</span>
                          <span className="font-medium">{userStats.bestScore}%</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Total Time Spent:</span>
                          <span className="font-medium">{Math.round(userStats.totalTimeSpent / 60)} minutes</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Favorite Category:</span>
                          <span className="font-medium">{userStats.favoriteCategory || "N/A"}</span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Quiz Streak:</span>
                          <span className="font-medium">{userStats.currentStreak} days</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Longest Streak:</span>
                          <span className="font-medium">{userStats.longestStreak} days</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Rank:</span>
                          <Badge variant="outline">{userStats.rank || "Unranked"}</Badge>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span>Last Active:</span>
                          <span className="font-medium">{formatDate(userStats.lastActive)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No statistics available yet.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {isOwnProfile
                        ? "Start taking quizzes to see your stats!"
                        : "This user hasn't taken any quizzes yet."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                        {getActivityIcon(activity.type)}
                        <div className="flex-1">
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(activity.createdAt)}</p>
                        </div>
                        {activity.points && <Badge variant="outline">+{activity.points} pts</Badge>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No recent activity.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {isOwnProfile
                        ? "Start creating or taking quizzes to see activity here!"
                        : "This user hasn't been active recently."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {achievements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((achievement, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-4 rounded-lg border bg-gradient-to-r from-yellow-50 to-orange-50"
                      >
                        <div className="text-yellow-600">{getAchievementIcon(achievement.type)}</div>
                        <div className="flex-1">
                          <h4 className="font-medium">{achievement.title}</h4>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Earned on {formatDate(achievement.earnedAt)}
                          </p>
                        </div>
                        <Badge variant="secondary">{achievement.rarity || "Common"}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No achievements yet.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {isOwnProfile
                        ? "Complete quizzes and reach milestones to earn achievements!"
                        : "This user hasn't earned any achievements yet."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
