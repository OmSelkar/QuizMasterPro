import { useEffect, useState, useContext } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { AppContext } from "../context/AppContext"
import { getAuth } from "firebase/auth"
import axios from "axios"
import moment from "moment"
import {
  User,
  Mail,
  MapPin,
  Globe,
  Calendar,
  Trophy,
  Target,
  Clock,
  BookOpen,
  Award,
  TrendingUp,
  Activity,
  Users,
  Star,
  CheckCircle,
  Timer,
  BarChart3,
} from "lucide-react"

export function UserProfileModal({ userId, isOpen, onClose }) {
  const { backendUrl } = useContext(AppContext)
  const auth = getAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [recentAttempts, setRecentAttempts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const isOwnProfile = auth.currentUser?.uid === userId

  console.log(`🔍 UserProfileModal opened for userId: ${userId}`)

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null)
      setStats(null)
      setRecentAttempts([])
      setError(null)
      return
    }

    fetchUserProfile()
  }, [isOpen, userId, backendUrl])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log(`🔍 Fetching profile for userId: ${userId}, isOwnProfile: ${isOwnProfile}`)

      let response
      if (isOwnProfile) {
        // For own profile, get performance data
        console.log("📱 Fetching own profile performance data")
        const token = await auth.currentUser.getIdToken()
        response = await axios.get(`${backendUrl}/api/users/profile/performance`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } else {
        // For other users, get public profile
        console.log(`🌐 Fetching public profile for: ${userId}`)
        response = await axios.get(`${backendUrl}/api/users/${userId}/public-profile`)
      }

      if (response.data.success) {
        console.log("✅ Profile data received:", response.data)
        setProfile(response.data.profile)
        setStats(response.data.stats)
        setRecentAttempts(response.data.recentAttempts || [])
      } else {
        throw new Error(response.data.message || "Failed to fetch profile")
      }
    } catch (err) {
      console.error("❌ Profile fetch error:", err)
      if (err.response?.status === 403) {
        setError("This profile is private")
      } else if (err.response?.status === 404) {
        setError("User not found")
      } else {
        setError("Failed to load profile")
      }
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatJoinDate = (dateString) => {
    if (!dateString) return "Unknown"
    return moment(dateString).format("MMMM YYYY")
  }

  const getOnlineStatusColor = (isOnline, lastSeen) => {
    if (isOnline) return "bg-green-500"
    if (!lastSeen) return "bg-gray-400"
    
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60))
    
    if (diffInMinutes < 5) return "bg-yellow-500"
    if (diffInMinutes < 60) return "bg-orange-500"
    return "bg-red-500"
  }

  const getOnlineStatusText = (isOnline, lastSeen) => {
    if (isOnline) return "Online"
    if (!lastSeen) return "Offline"
    
    const lastSeenDate = new Date(lastSeen)
    const now = new Date()
    const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60))
    
    if (diffInMinutes < 5) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const calculatePercentage = (score, maxScore) => {
    if (!score || !maxScore || maxScore === 0) return 0
    return Math.round((score / maxScore) * 100)
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {loading ? "Loading Profile..." : profile?.name || "User Profile"}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading profile...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="text-destructive mb-4">
              <User className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Profile Unavailable</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        )}

        {!loading && !error && profile && (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile.photoURL} alt={profile.name} />
                      <AvatarFallback className="text-lg">
                        {profile.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {profile.isOnline !== undefined && (
                      <div
                        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background ${getOnlineStatusColor(
                          profile.isOnline,
                          profile.lastSeen,
                        )}`}
                        title={getOnlineStatusText(profile.isOnline, profile.lastSeen)}
                      />
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <h2 className="text-2xl font-bold">{profile.name}</h2>
                      {profile.bio && <p className="text-muted-foreground mt-1">{profile.bio}</p>}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {profile.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span>{profile.email}</span>
                        </div>
                      )}
                      {profile.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{profile.location}</span>
                        </div>
                      )}
                      {profile.website && (
                        <div className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          <a
                            href={profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary"
                          >
                            Website
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Joined {formatJoinDate(profile.createdAt || profile.joinedDate)}</span>
                      </div>
                    </div>

                    {profile.isOnline !== undefined && (
                      <Badge variant={profile.isOnline ? "default" : "secondary"} className="w-fit">
                        <Activity className="h-3 w-3 mr-1" />
                        {getOnlineStatusText(profile.isOnline, profile.lastSeen)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Quizzes Taken</p>
                        <p className="text-2xl font-bold">{stats.totalQuizzes || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Quizzes Created</p>
                        <p className="text-2xl font-bold">{stats.totalQuizzesCreated || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                        <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Perfect Scores</p>
                        <p className="text-2xl font-bold">{stats.perfectScores || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Time Spent</p>
                        <p className="text-2xl font-bold">{formatTime(stats.totalTimeSpent || 0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Quiz Attempts */}
            {recentAttempts && recentAttempts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Recent Quiz Attempts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentAttempts.slice(0, 5).map((attempt, index) => {
                      const percentage = calculatePercentage(attempt.score, attempt.maxPossibleScore)
                      return (
                        <div key={attempt.id || index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex-1">
                            <h4 className="font-medium">{attempt.quizTitle}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                <span>
                                  {attempt.score}/{attempt.maxPossibleScore} points
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                <span>{formatTime(attempt.timeTaken)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{moment(attempt.completedAt).format("MMM D, YYYY")}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge variant={percentage >= 80 ? "default" : percentage >= 60 ? "secondary" : "destructive"}>
                              {percentage}%
                            </Badge>
                            <div className="w-20">
                              <Progress value={Math.min(Math.max(percentage, 0), 100)} className="h-2" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Data Message */}
            {!loading && !error && (!stats || (stats.totalQuizzes === 0 && stats.totalQuizzesCreated === 0)) && (
              <Card>
                <CardContent className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Quiz Activity</h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile ? "You haven't taken or created any quizzes yet." : "This user hasn't taken any quizzes yet."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}