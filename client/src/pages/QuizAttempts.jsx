"use client"

import { useState, useEffect, useContext } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { getAuth } from "firebase/auth"
import { AppContext } from "../context/AppContext"
import Loading from "../components/Loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, Users, Trophy, Clock, Calendar } from "lucide-react"

export default function QuizAttempts() {
  const { id } = useParams()
  const { backendUrl } = useContext(AppContext)
  const auth = getAuth()
  const navigate = useNavigate()
  const [attempts, setAttempts] = useState([])
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!auth.currentUser) {
          navigate("/login")
          return
        }

        const token = await auth.currentUser.getIdToken()

        // Fetch quiz details and attempts in parallel
        const [quizRes, attemptsRes] = await Promise.all([
          axios.get(`${backendUrl}/api/quizzes/${id}/detail`),
          axios.get(`${backendUrl}/api/quizzes/${id}/attempts`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (quizRes.data.success) {
          setQuiz(quizRes.data.detail)
        }

        if (attemptsRes.data.success) {
          setAttempts(attemptsRes.data.attempts)
        } else {
          setError(attemptsRes.data.message || "Failed to load attempts")
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err.response?.data?.message || "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, auth.currentUser, backendUrl, navigate])

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getScoreVariant = (score, totalPoints) => {
    if (!totalPoints || totalPoints === 0) return "secondary"
    const percentage = (score / totalPoints) * 100
    if (percentage >= 90) return "default"
    if (percentage >= 70) return "secondary"
    if (percentage >= 50) return "outline"
    return "destructive"
  }

  const getUserInitial = (userName) => {
    if (!userName || typeof userName !== "string") return "?"
    return userName.charAt(0).toUpperCase()
  }

  if (loading) return <Loading />

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Attempts</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button onClick={() => navigate("/my-quizzes")} variant="ghost" className="mb-4 px-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Quizzes
          </Button>
          <h1 className="text-3xl font-bold">Quiz Attempts</h1>
          {quiz && (
            <p className="text-muted-foreground text-lg">
              {quiz.title} • {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}
            </p>
          )}
        </div>
      </div>

      {/* Quiz Info */}
      {quiz && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Quiz Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Questions:</span>
                <span className="font-medium">{quiz.questionsCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Max Score:</span>
                <span className="font-medium">{quiz.totalPoints}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Time Limit:</span>
                <span className="font-medium">{quiz.timeLimit ? `${quiz.timeLimit} min` : "No limit"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Created:</span>
                <span className="font-medium">{formatDate(quiz.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Attempts ({attempts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No attempts yet</h3>
              <p className="text-muted-foreground">This quiz hasn't been attempted by anyone yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt) => (
                <div
                  key={attempt._id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/placeholder.svg" alt={attempt.userName || "User"} />
                      <AvatarFallback>{getUserInitial(attempt.userName || attempt.userId)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{attempt.userName || "Anonymous User"}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(attempt.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge variant={getScoreVariant(attempt.score, attempt.totalPoints || quiz?.totalPoints)}>
                        {attempt.score}/{attempt.totalPoints || quiz?.totalPoints || "-"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attempt.totalPoints || quiz?.totalPoints
                          ? `${Math.round((attempt.score / (attempt.totalPoints || quiz.totalPoints)) * 100)}%`
                          : "N/A"}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {formatTime(attempt.timeTaken)}
                      </div>
                      <p className="text-xs text-muted-foreground">Time taken</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {attempts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Attempts</p>
                  <p className="text-2xl font-bold">{attempts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl font-bold">
                    {Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Avg Time</p>
                  <p className="text-2xl font-bold">
                    {formatTime(Math.round(attempts.reduce((sum, a) => sum + (a.timeTaken || 0), 0) / attempts.length))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
