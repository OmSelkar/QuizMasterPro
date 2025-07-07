"use client"

import { useState, useEffect, useContext } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { AppContext } from "../context/AppContext"
import axios from "axios"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ArrowLeft, Users, Target, Clock, Award, Eye, Share2, FileText } from "lucide-react"
import { UserProfileModal } from "../components/user-profile-modal"

export default function QuizAnalytics() {
  const { id: quizId } = useParams()
  const { user } = useAuth()
  const { backendUrl } = useContext(AppContext)
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [analytics, setAnalytics] = useState({
    totalAttempts: 0,
    uniqueUsers: 0,
    averageScore: 0,
    averageTime: 0,
    completionRate: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate("/login")
      return
    }

    if (!quizId) {
      setError("Invalid quiz ID")
      setLoading(false)
      return
    }

    fetchAnalytics()
  }, [quizId, user, navigate])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const token = await user.getIdToken()

      console.log("Fetching analytics for quiz:", quizId)

      // Fetch quiz details first
      const quizResponse = await axios.get(`${backendUrl}/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!quizResponse.data.success) {
        throw new Error("Quiz not found")
      }

      const quizData = quizResponse.data.quiz
      console.log("Quiz data:", quizData)

      // Check if user owns this quiz
      if (quizData.creatorId !== user.uid) {
        setError("You don't have permission to view analytics for this quiz")
        return
      }

      setQuiz(quizData)

      // Fetch attempts using the correct endpoint
      const attemptsResponse = await axios.get(`${backendUrl}/api/quizzes/${quizId}/attempts`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log("Attempts response:", attemptsResponse.data)

      if (attemptsResponse.data.success) {
        const attemptsData = attemptsResponse.data.attempts
        setAttempts(attemptsData)
        calculateAnalytics(attemptsData, quizData)
      } else {
        console.error("Failed to fetch attempts:", attemptsResponse.data.message)
        setAttempts([])
        calculateAnalytics([], quizData)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
      if (error.response?.status === 403) {
        setError("You don't have permission to view analytics for this quiz")
      } else if (error.response?.status === 404) {
        setError("Quiz not found")
      } else {
        setError(error.response?.data?.message || "Failed to load analytics")
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (attemptsData, quizData) => {
    if (!attemptsData.length) {
      setAnalytics({
        totalAttempts: 0,
        uniqueUsers: 0,
        averageScore: 0,
        averageTime: 0,
        completionRate: 0,
      })
      return
    }

    const totalQuestions = quizData.questions?.length || 1
    const maxPossibleScore = quizData.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || totalQuestions

    console.log("Calculating analytics with:", {
      attemptsCount: attemptsData.length,
      totalQuestions,
      maxPossibleScore,
    })

    const totalAttempts = attemptsData.length
    const uniqueUsers = new Set(attemptsData.map((attempt) => attempt.userId)).size

    // Calculate average score percentage properly
    const totalScorePercentage = attemptsData.reduce((sum, attempt) => {
      const score = attempt.score || 0
      const maxScore = attempt.maxPossibleScore || maxPossibleScore
      const percentage = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0
      return sum + percentage
    }, 0)

    const averageScore = totalAttempts > 0 ? Math.round(totalScorePercentage / totalAttempts) : 0

    // Calculate average time with proper validation
    const validAttempts = attemptsData.filter((attempt) => attempt.timeTaken && attempt.timeTaken > 0)
    const totalTime = validAttempts.reduce((sum, attempt) => sum + (attempt.timeTaken || 0), 0)
    const averageTime = validAttempts.length > 0 ? Math.round(totalTime / validAttempts.length) : 0

    const completionRate = totalAttempts > 0 ? Math.round((validAttempts.length / totalAttempts) * 100) : 0

    const finalAnalytics = {
      totalAttempts,
      uniqueUsers,
      averageScore: Math.max(0, Math.min(averageScore, 100)),
      averageTime: Math.max(0, averageTime),
      completionRate: Math.max(0, Math.min(completionRate, 100)),
    }

    console.log("Final analytics:", finalAnalytics)
    setAnalytics(finalAnalytics)
  }

  const handleUserClick = (userId) => {
    console.log("Clicked user ID:", userId)
    if (userId && userId !== "unknown" && userId !== "anonymous") {
      setSelectedUserId(userId)
      setProfileModalOpen(true)
    }
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getScoreColor = (score, maxScore) => {
    const percentage = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0
    if (percentage >= 80) return "text-green-600"
    if (percentage >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getPerformanceLabel = (score, maxScore) => {
    const percentage = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0
    if (percentage >= 90) return "Excellent"
    if (percentage >= 80) return "Good"
    if (percentage >= 70) return "Average"
    if (percentage >= 60) return "Below Average"
    return "Poor"
  }

  const getPerformanceColor = (score, maxScore) => {
    const percentage = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0
    if (percentage >= 90) return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
    if (percentage >= 80) return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    if (percentage >= 70) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
    if (percentage >= 60) return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
    return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
  }

  // Prepare chart data with proper score ranges
  const scoreDistribution = attempts.reduce((acc, attempt) => {
    const maxScore = attempt.maxPossibleScore || quiz?.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 1
    const percentage = maxScore > 0 ? Math.min(Math.round((attempt.score / maxScore) * 100), 100) : 0

    let range
    if (percentage >= 90) range = "90-100%"
    else if (percentage >= 80) range = "80-89%"
    else if (percentage >= 70) range = "70-79%"
    else if (percentage >= 60) range = "60-69%"
    else if (percentage >= 50) range = "50-59%"
    else if (percentage >= 40) range = "40-49%"
    else if (percentage >= 30) range = "30-39%"
    else if (percentage >= 20) range = "20-29%"
    else if (percentage >= 10) range = "10-19%"
    else range = "0-9%"

    acc[range] = (acc[range] || 0) + 1
    return acc
  }, {})

  const chartData = Object.entries(scoreDistribution)
    .map(([range, count]) => ({ range, count }))
    .sort((a, b) => {
      const aStart = Number.parseInt(a.range.split("-")[0])
      const bStart = Number.parseInt(b.range.split("-")[0])
      return bStart - aStart // Sort descending
    })

  // Colors for the chart
  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"]

  const exportToCSV = () => {
    setIsExporting(true)
    try {
      const headers = [
        "Quiz Title",
        "User Name",
        "User Email",
        "Score",
        "Max Score",
        "Percentage",
        "Time Taken (seconds)",
        "Completed At",
        "Performance Level",
      ]

      const rows = attempts.map((attempt) => {
        const maxScore = attempt.maxPossibleScore || quiz?.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 1
        const percentage = maxScore > 0 ? Math.round((attempt.score / maxScore) * 100) : 0
        const performanceLevel = getPerformanceLabel(attempt.score, maxScore)

        return [
          quiz?.title || "Unknown Quiz",
          attempt.userName || "Anonymous",
          attempt.userEmail || "",
          attempt.score || 0,
          maxScore,
          percentage,
          attempt.timeTaken || 0,
          new Date(attempt.completedAt || attempt.createdAt).toLocaleString(),
          performanceLevel,
        ]
      })

      // Add summary row
      rows.unshift([
        "SUMMARY",
        `Total Attempts: ${analytics.totalAttempts}`,
        `Unique Users: ${analytics.uniqueUsers}`,
        `Average Score: ${analytics.averageScore}%`,
        `Average Time: ${formatTime(analytics.averageTime)}`,
        `Completion Rate: ${analytics.completionRate}%`,
        "",
        new Date().toLocaleString(),
        "",
      ])

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `quiz-analytics-${quiz?.title?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "unknown"}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      alert("Failed to export CSV. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-destructive mb-4">{error}</div>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground mb-4">Quiz not found</div>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const maxPossibleScore = quiz.questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 1

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{quiz.title}</h1>
            <p className="text-muted-foreground">Quiz Analytics Dashboard</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isExporting}>
              <FileText className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.totalAttempts}</p>
                  <p className="text-sm text-muted-foreground">Total Attempts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.uniqueUsers}</p>
                  <p className="text-sm text-muted-foreground">Unique Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                  <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.averageScore}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatTime(analytics.averageTime)}</p>
                  <p className="text-sm text-muted-foreground">Average Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="attempts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="attempts">All Attempts</TabsTrigger>
            <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="attempts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  All Attempts ({attempts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attempts.length > 0 ? (
                  <div className="space-y-4">
                    {attempts.map((attempt) => {
                      const attemptMaxScore = attempt.maxPossibleScore || maxPossibleScore
                      const percentage =
                        attemptMaxScore > 0 ? Math.min(Math.round((attempt.score / attemptMaxScore) * 100), 100) : 0
                      const timeTaken = attempt.timeTaken || 0

                      return (
                        <div
                          key={attempt._id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar
                              className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                              onClick={() => handleUserClick(attempt.userId)}
                            >
                              <AvatarImage src={attempt.userPhotoURL || "/placeholder.svg"} />
                              <AvatarFallback>{attempt.userName?.[0] || attempt.userEmail?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p
                                className="font-medium cursor-pointer hover:text-primary transition-colors"
                                onClick={() => handleUserClick(attempt.userId)}
                              >
                                {attempt.userName || attempt.userEmail || "Anonymous"}
                              </p>
                              <p className="text-sm text-muted-foreground">{attempt.userEmail}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className={`font-bold ${getScoreColor(attempt.score, attemptMaxScore)}`}>
                                {attempt.score}/{attemptMaxScore}
                              </p>
                              <p className="text-sm text-muted-foreground">{percentage}%</p>
                            </div>

                            <Badge className={getPerformanceColor(attempt.score, attemptMaxScore)}>
                              {getPerformanceLabel(attempt.score, attemptMaxScore)}
                            </Badge>

                            <div className="text-right">
                              <p className="text-sm font-medium">{formatTime(timeTaken)}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(attempt.completedAt || attempt.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Attempts Yet</h3>
                    <p className="text-muted-foreground">
                      Share your quiz to start collecting responses and analytics.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="range" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                          }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Number of Attempts" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{analytics.averageScore}%</p>
                      <p className="text-sm text-muted-foreground">Average Score</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{analytics.completionRate}%</p>
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Excellent (90-100%)</span>
                      <span>
                        {
                          attempts.filter((a) => {
                            const maxScore = a.maxPossibleScore || maxPossibleScore
                            return maxScore > 0 && (a.score / maxScore) * 100 >= 90
                          }).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Good (80-89%)</span>
                      <span>
                        {
                          attempts.filter((a) => {
                            const maxScore = a.maxPossibleScore || maxPossibleScore
                            if (maxScore === 0) return false
                            const pct = (a.score / maxScore) * 100
                            return pct >= 80 && pct < 90
                          }).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Average (70-79%)</span>
                      <span>
                        {
                          attempts.filter((a) => {
                            const maxScore = a.maxPossibleScore || maxPossibleScore
                            if (maxScore === 0) return false
                            const pct = (a.score / maxScore) * 100
                            return pct >= 70 && pct < 80
                          }).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Below Average (60-69%)</span>
                      <span>
                        {
                          attempts.filter((a) => {
                            const maxScore = a.maxPossibleScore || maxPossibleScore
                            if (maxScore === 0) return false
                            const pct = (a.score / maxScore) * 100
                            return pct >= 60 && pct < 70
                          }).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Poor (0-59%)</span>
                      <span>
                        {
                          attempts.filter((a) => {
                            const maxScore = a.maxPossibleScore || maxPossibleScore
                            return maxScore > 0 && (a.score / maxScore) * 100 < 60
                          }).length
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} userId={selectedUserId} />
    </>
  )
}
