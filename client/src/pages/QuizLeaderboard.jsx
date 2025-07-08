"use client"

import { useEffect, useState, useContext } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { getAuth } from "firebase/auth"
import { AppContext } from "../context/AppContext"
import { UserProfileModal } from "../components/user-profile-modal"
import Loading from "../components/Loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Trophy, Users, Target, TrendingUp, Calendar, Timer } from "lucide-react"

export default function QuizLeaderboard() {
  const { id: quizId } = useParams()
  const navigate = useNavigate()
  const { backendUrl } = useContext(AppContext)
  const auth = getAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login")
      return
    }
    if (!quizId) {
      setError("Quiz ID is missing")
      return
    }
    fetchLeaderboard()
  }, [quizId])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await auth.currentUser.getIdToken()
      const res = await axios.get(`${backendUrl}/api/quizzes/${quizId}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to load leaderboard")
      }

      setQuiz(res.data.quiz || {})
      setLeaderboard(res.data.leaderboard || [])
      setStats(res.data.statistics || {})
    } catch (err) {
      console.error("fetchLeaderboard error:", err)
      setError(err.response?.data?.message || err.message || "Server error")
    } finally {
      setLoading(false)
    }
  }

  const handleUserClick = (userId) => {
    if (userId && userId !== "unknown" && userId !== "anonymous" && userId !== "private") {
      setSelectedUserId(userId)
      setProfileModalOpen(true)
    }
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return "Unknown"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getScoreVariant = (score, maxScore) => {
    if (!score || !maxScore || maxScore === 0) return "secondary"
    const percentage = (score / maxScore) * 100
    if (percentage >= 90) return "default"
    if (percentage >= 70) return "secondary"
    if (percentage >= 50) return "outline"
    return "destructive"
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return "🥇"
    if (rank === 2) return "🥈"
    if (rank === 3) return "🥉"
    return null
  }

  const getUserInitial = (userName) => {
    if (!userName || typeof userName !== "string") return "?"
    return userName.charAt(0).toUpperCase()
  }

  const getUserDisplayName = (userName) => {
    if (!userName || typeof userName !== "string") return "Anonymous"
    return userName
  }

  const calculatePercentage = (score, maxScore) => {
    if (!score || !maxScore || maxScore === 0) return 0
    return Math.round((score / maxScore) * 100)
  }

  if (loading) return <Loading />

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={fetchLeaderboard} variant="destructive">
                Try Again
              </Button>
              <Button onClick={() => navigate("/my-quizzes")} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to My Quizzes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="container mx-auto p-6 max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <Button onClick={() => navigate("/my-quizzes")} variant="ghost" className="mb-4 px-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Quizzes
          </Button>
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0">
            <CardContent className="pt-6">
              <h1 className="text-3xl font-bold mb-2">{quiz?.title || "Quiz"} Leaderboard</h1>
              <p className="text-primary-foreground/80">{quiz?.description || "No description available"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Attempts</p>
                    <p className="text-2xl font-bold">{stats.totalAttempts || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold">{stats.averageScore || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Max Possible Score</p>
                    <p className="text-2xl font-bold">{stats.maxPossibleScore || 0}</p>
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
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">
                      {stats.maxPossibleScore > 0 ? Math.round((stats.averageScore / stats.maxPossibleScore) * 100) : 0}
                      %
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!leaderboard || leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No attempts yet</h3>
                <p className="text-muted-foreground">Be the first to take this quiz!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((row, index) => {
                  const userName = getUserDisplayName(row?.user)
                  const userInitial = getUserInitial(row?.user)
                  const score = row?.score || 0
                  const rank = row?.rank || index + 1
                  const timeTaken = row?.timeTaken || 0
                  const createdAt = row?.createdAt
                  const isCurrentUser = row?.isCurrentUser || false
                  const userId = row?.userId

                  const percentage =
                    stats?.maxPossibleScore && stats.maxPossibleScore > 0
                      ? calculatePercentage(score, stats.maxPossibleScore)
                      : 0

                  const rankIcon = getRankIcon(rank)

                  return (
                    <div
                      key={`${userId || 'unknown'}-${index}-${score}-${timeTaken}-${createdAt}`}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                        userId && userId !== "unknown" && userId !== "anonymous" && userId !== "private" ? "cursor-pointer hover:bg-muted/70" : ""
                      } ${
                        isCurrentUser
                          ? "bg-primary/5 border-primary/20"
                          : rank <= 3
                            ? "bg-muted/50"
                            : "hover:bg-muted/50"
                      }`}
                      onClick={() => userId && userId !== "unknown" && userId !== "anonymous" && userId !== "private" && handleUserClick(userId)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {rankIcon ? (
                            <span className="text-2xl">{rankIcon}</span>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                              {rank}
                            </div>
                          )}
                          {isCurrentUser && <Badge variant="outline">You</Badge>}
                        </div>

                        <Avatar className="h-10 w-10">
                          <AvatarImage src={row?.userPhotoURL || "/placeholder.svg"} alt={userName} />
                          <AvatarFallback>{userInitial}</AvatarFallback>
                        </Avatar>

                        <div>
                          <p
                            className={`font-medium ${
                              userId && userId !== "unknown" && userId !== "anonymous" && userId !== "private" 
                                ? "hover:text-primary transition-colors" 
                                : "text-muted-foreground"
                            }`}
                          >
                            {userName}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              <span>Time Taken: {formatTime(timeTaken)}</span>
                            </div>
                            {createdAt && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Completed: {formatDateTime(createdAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right space-y-2">
                        <Badge variant={getScoreVariant(score, stats?.maxPossibleScore)}>
                          {score}/{stats?.maxPossibleScore || 0}
                        </Badge>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={Math.min(Math.max(percentage, 0), 100)} className="h-2" />
                          <span className="text-sm font-medium text-muted-foreground">
                            {percentage > 0 ? `${percentage}%` : "0%"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        {leaderboard && leaderboard.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            <p>Showing top {leaderboard.length} performers</p>
          </div>
        )}
      </div>

      <UserProfileModal userId={selectedUserId} isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  )
}
