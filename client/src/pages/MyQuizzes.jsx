"use client"

import { useState, useEffect, useContext } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { AppContext } from "../context/AppContext"
import axios from "axios"
import Loading from "../components/Loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  Users,
  Clock,
  Target,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  Play,
  Timer,
} from "lucide-react"

export default function MyQuizzes() {
  const { userId } = useParams()
  const { user } = useAuth()
  const { backendUrl } = useContext(AppContext)
  const navigate = useNavigate()

  const [quizzes, setQuizzes] = useState([])
  const [attempts, setAttempts] = useState([])
  const [performance, setPerformance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPlayModal, setShowPlayModal] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState(null)

  useEffect(() => {
    // Redirect if user is trying to access someone else's dashboard
    if (user && userId !== user.uid) {
      navigate(`/my-quizzes/${user.uid}`, { replace: true })
      return
    }

    if (user) {
      loadData()
    }
  }, [user, userId, navigate, backendUrl])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      console.log("Loading data for user:", user.uid)

      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken()

      // Use the correct API endpoints that exist in your backend
      const [quizzesRes, attemptsRes, performanceRes] = await Promise.all([
        axios.get(`${backendUrl}/api/quizzes/my-created`, {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
        axios.get(`${backendUrl}/api/quizzes/my-attempts`, {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
        axios.get(`${backendUrl}/api/quizzes/my-performance`, {
          headers: { Authorization: `Bearer ${idToken}` },
        }),
      ])

      if (quizzesRes.data.success) {
        setQuizzes(quizzesRes.data.quizzes || [])
      }

      if (attemptsRes.data.success) {
        setAttempts(attemptsRes.data.attempts || [])
      }

      if (performanceRes.data.success) {
        setPerformance(performanceRes.data.performance || [])
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err)
      setError(err.response?.data?.message || err.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return
    }

    try {
      const idToken = await user.getIdToken()
      const response = await axios.delete(`${backendUrl}/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      })

      if (response.data.success) {
        setQuizzes(quizzes.filter((q) => q._id !== quizId))
      }
    } catch (err) {
      console.error("Error deleting quiz:", err)
      alert("Failed to delete quiz")
    }
  }

  const handlePlayQuiz = (quiz) => {
    setSelectedQuiz(quiz)
    setShowPlayModal(true)
  }

  const confirmPlayQuiz = () => {
    setShowPlayModal(false)
    navigate(`/quiz/${selectedQuiz._id}/play`)
  }

  const handleEditQuiz = (quizId) => {
    console.log("Navigating to quiz edit:", quizId)
    // Fixed: Navigate to the correct edit route that exists in your app
    navigate(`/quiz/${quizId}/edit`)
  }

  const handleViewAnalytics = (quizId) => {
    console.log("Navigating to analytics for quiz:", quizId)
    navigate(`/quiz/${quizId}/analytics`)
  }

  if (loading) return <Loading />

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadData} variant="destructive">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate statistics
  const totalQuizzes = quizzes.length
  const totalAttempts = attempts.length
  const averageScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.score / a.totalPoints) * 100, 0) / attempts.length)
      : 0

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <p className="text-muted-foreground">User ID: {userId}</p>
          </div>
          <Button onClick={() => navigate("/create-quiz")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Quiz
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Quizzes</p>
                  <p className="text-2xl font-bold">{totalQuizzes}</p>
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
                  <p className="text-sm text-muted-foreground">Quiz Attempts</p>
                  <p className="text-2xl font-bold">{totalAttempts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold">{averageScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Best Score</p>
                  <p className="text-2xl font-bold">
                    {attempts.length > 0
                      ? Math.max(...attempts.map((a) => Math.round((a.score / a.totalPoints) * 100)))
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="quizzes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="quizzes">My Quizzes ({totalQuizzes})</TabsTrigger>
            <TabsTrigger value="attempts">My Attempts ({totalAttempts})</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="quizzes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Created Quizzes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quizzes.length > 0 ? (
                  <div className="space-y-3">
                    {quizzes.map((quiz) => (
                      <div
                        key={quiz._id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold">{quiz.title}</h3>
                          <p className="text-sm text-muted-foreground">{quiz.description || "No description"}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="outline">{quiz.questions?.length || 0} questions</Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(quiz.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {quiz.attempts || 0} attempts
                            </span>
                            {quiz.timeLimit > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {quiz.timeLimit} min
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => handlePlayQuiz(quiz)}>
                            <Play className="h-4 w-4 mr-1" />
                            Play
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditQuiz(quiz._id)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleViewAnalytics(quiz._id)}>
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Analytics
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteQuiz(quiz._id)}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No quizzes created yet.</p>
                    <Button onClick={() => navigate("/create-quiz")} className="mt-3">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Quiz
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attempts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quiz Attempts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attempts.length > 0 ? (
                  <div className="space-y-3">
                    {attempts.map((attempt) => (
                      <div
                        key={attempt._id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold">{attempt.quiz?.title}</h3>
                          <p className="text-sm text-muted-foreground">by {attempt.quiz?.creatorName}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <Badge variant="outline">
                              {Math.round((attempt.score / attempt.totalPoints) * 100)}% score
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.floor(attempt.timeTaken / 60)}:
                              {(attempt.timeTaken % 60).toString().padStart(2, "0")}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(attempt.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/quiz/${attempt.quizId}/result/${attempt._id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Result
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No quiz attempts yet.</p>
                    <Button onClick={() => navigate("/quiz-list")} className="mt-3">
                      <Eye className="h-4 w-4 mr-2" />
                      Browse Quizzes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quiz Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {performance.length > 0 ? (
                  <div className="space-y-4">
                    {performance.map((item) => (
                      <div key={item.quiz._id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{item.quiz.title}</h3>
                          <Button size="sm" variant="outline" onClick={() => handleViewAnalytics(item.quiz._id)}>
                            <BarChart3 className="h-4 w-4 mr-1" />
                            View Analytics
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Attempts</p>
                            <p className="font-semibold">{item.attempts.length}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Average Score</p>
                            <p className="font-semibold">
                              {item.attempts.length > 0
                                ? Math.round(item.attempts.reduce((sum, a) => sum + a.score, 0) / item.attempts.length)
                                : 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Best Score</p>
                            <p className="font-semibold">
                              {item.attempts.length > 0 ? Math.max(...item.attempts.map((a) => a.score)) : 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Time</p>
                            <p className="font-semibold">
                              {item.attempts.length > 0
                                ? `${Math.round(
                                    item.attempts.reduce((sum, a) => sum + a.timeTaken, 0) / item.attempts.length / 60,
                                  )}m`
                                : "0m"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No performance data available.</p>
                    <p className="text-sm text-muted-foreground">Create quizzes and get attempts to see analytics.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Play Quiz Confirmation Modal */}
      {showPlayModal && selectedQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle>Ready to play "{selectedQuiz.title}"?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Questions:</strong> {selectedQuiz.questions?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Time Limit:</strong>{" "}
                  {selectedQuiz.timeLimit > 0 ? `${selectedQuiz.timeLimit} minutes` : "No limit"}
                </p>
              </div>
              <p className="text-muted-foreground">
                {selectedQuiz.timeLimit > 0
                  ? `You will have ${selectedQuiz.timeLimit} minutes to complete this quiz. The timer will start as soon as you begin.`
                  : "This quiz has no time limit. Take your time to answer each question carefully."}
              </p>
              <div className="flex justify-end gap-3">
                <Button onClick={() => setShowPlayModal(false)} variant="outline">
                  Cancel
                </Button>
                <Button onClick={confirmPlayQuiz}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
