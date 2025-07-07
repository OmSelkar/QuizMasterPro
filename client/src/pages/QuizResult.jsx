"use client"

import { useState, useEffect, useContext } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { getAuth } from "firebase/auth"
import axios from "axios"
import { AppContext } from "../context/AppContext"
import Loading from "../components/Loading"
import QuizResultExport from "../components/QuizResultExport"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Trophy,
  RotateCcw,
  Share2,
  Eye,
  Star,
  TrendingUp,
  Award,
  BookOpen,
  AlertTriangle,
  BarChart3,
} from "lucide-react"

export default function QuizResult() {
  const { id, attemptId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { backendUrl } = useContext(AppContext)
  const auth = getAuth()

  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Get result data from navigation state or fetch from API
  const resultData = location.state?.result

  useEffect(() => {
    if (resultData) {
      setResult(resultData)
      loadQuizData()
    } else if (attemptId) {
      loadResultData()
    } else {
      setError("No attempt ID provided")
      setLoading(false)
    }
  }, [id, attemptId])

  const loadQuizData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/quizzes/${id}`)
      if (data.success) {
        setQuiz(data.quiz)
      }
    } catch (error) {
      console.error("Error loading quiz:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadResultData = async () => {
    try {
      setLoading(true)
      if (!auth.currentUser) {
        setError("Please log in to view your results")
        return
      }

      const idToken = await auth.currentUser.getIdToken()
      const { data } = await axios.get(`${backendUrl}/api/quizzes/${id}/result/${attemptId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      })

      if (data.success && data.attempt) {
        setResult(data.attempt)
        setQuiz(data.attempt.quiz)
      } else {
        setError("No quiz results found")
      }
    } catch (error) {
      console.error("Error loading result:", error)
      setError("Failed to load quiz results")
    } finally {
      setLoading(false)
    }
  }

  const retakeQuiz = () => {
    navigate(`/quiz/${id}/play`)
  }

  const shareResult = async () => {
    const shareText = `I scored ${Math.round(result.percentage || result.score)}% on "${quiz.title}"! 🎯`
    const shareUrl = `${window.location.origin}/quiz/${id}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: quiz.title,
          text: shareText,
          url: shareUrl,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
        alert("Result copied to clipboard!")
      } catch (error) {
        alert(`${shareText} ${shareUrl}`)
      }
    }
  }

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    if (score >= 50) return "text-orange-600"
    return "text-red-600"
  }

  const getScoreBadge = (score) => {
    if (score >= 90) return { variant: "default", text: "Excellent", icon: Trophy }
    if (score >= 70) return { variant: "secondary", text: "Good", icon: Star }
    if (score >= 50) return { variant: "outline", text: "Fair", icon: Target }
    return { variant: "destructive", text: "Needs Improvement", icon: AlertTriangle }
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const renderAnswer = (question, userAnswer, isCorrect) => {
    switch (question.type) {
      case "mcq":
      case "true_false": {
        const selectedOption = question.options?.[Number.parseInt(userAnswer)]
        const correctOption = question.options?.[Number.parseInt(question.correct)]
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Your answer:</span>
              <Badge variant={isCorrect ? "default" : "destructive"}>
                {typeof selectedOption === "string" ? selectedOption : selectedOption?.text || "No answer"}
              </Badge>
            </div>
            {!isCorrect && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Correct answer:</span>
                <Badge variant="outline">
                  {typeof correctOption === "string" ? correctOption : correctOption?.text || "Unknown"}
                </Badge>
              </div>
            )}
          </div>
        )
      }

      case "checkbox": {
        const userSelections = Array.isArray(userAnswer) ? userAnswer : []
        const correctSelections = Array.isArray(question.correct) ? question.correct : []
        return (
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium">Your selections:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {userSelections.length > 0 ? (
                  userSelections.map((idx) => {
                    const option = question.options?.[Number.parseInt(idx)]
                    const isCorrectSelection = correctSelections.includes(idx)
                    return (
                      <Badge key={idx} variant={isCorrectSelection ? "default" : "destructive"}>
                        {typeof option === "string" ? option : option?.text || `Option ${Number.parseInt(idx) + 1}`}
                      </Badge>
                    )
                  })
                ) : (
                  <Badge variant="destructive">No selections</Badge>
                )}
              </div>
            </div>
            {!isCorrect && (
              <div>
                <span className="text-sm font-medium">Correct selections:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {correctSelections.map((idx) => {
                    const option = question.options?.[Number.parseInt(idx)]
                    return (
                      <Badge key={idx} variant="outline">
                        {typeof option === "string" ? option : option?.text || `Option ${Number.parseInt(idx) + 1}`}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      }

      case "text_input": {
        const correctAnswers = Array.isArray(question.correct) ? question.correct : [question.correct]
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Your answer:</span>
              <Badge variant={isCorrect ? "default" : "destructive"}>{userAnswer || "No answer"}</Badge>
            </div>
            {!isCorrect && (
              <div>
                <span className="text-sm font-medium">Accepted answers:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {correctAnswers.map((answer, idx) => (
                    <Badge key={idx} variant="outline">
                      {answer}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }

      default:
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">Answer: {userAnswer || "No answer"}</span>
          </div>
        )
    }
  }

  const renderParagraphSubQuestions = (question, userAnswers, questionIndex) => {
    if (!question.subQuestions || question.subQuestions.length === 0) {
      return null
    }

    return (
      <div className="space-y-4 mt-4">
        <h4 className="font-medium text-sm text-muted-foreground">Sub-questions:</h4>
        {question.subQuestions.map((subQ, subIndex) => {
          const userAnswer = userAnswers?.[subIndex]
          const isCorrect = result.questionResults?.[questionIndex]?.subQuestionResults?.[subIndex]?.isCorrect || false
          const pointsEarned =
            result.questionResults?.[questionIndex]?.subQuestionResults?.[subIndex]?.pointsEarned || 0

          return (
            <div key={subIndex} className="border-l-2 border-muted pl-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">Sub-question {subIndex + 1}</p>
                  <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: subQ.text }} />
                </div>
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {pointsEarned}/{subQ.points || 1} pts
                  </span>
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">{renderSubQuestionAnswer(subQ, userAnswer, isCorrect)}</div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderSubQuestionAnswer = (subQuestion, userAnswer, isCorrect) => {
    switch (subQuestion.type) {
      case "text_input":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Your answer:</span>
              <Badge variant={isCorrect ? "default" : "destructive"}>{userAnswer || "No answer"}</Badge>
            </div>
            {!isCorrect && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Correct answer:</span>
                <Badge variant="outline">{subQuestion.correct || "Unknown"}</Badge>
              </div>
            )}
          </div>
        )

      case "mcq": {
        const selectedOption = subQuestion.options?.[Number.parseInt(userAnswer)]
        const correctOption = subQuestion.options?.[Number.parseInt(subQuestion.correct)]
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Your answer:</span>
              <Badge variant={isCorrect ? "default" : "destructive"}>{selectedOption || "No answer"}</Badge>
            </div>
            {!isCorrect && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Correct answer:</span>
                <Badge variant="outline">{correctOption || "Unknown"}</Badge>
              </div>
            )}
          </div>
        )
      }

      case "true_false": {
        const userChoice = userAnswer === "0" ? "True" : userAnswer === "1" ? "False" : "No answer"
        const correctChoice = subQuestion.correct === "0" ? "True" : "False"
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Your answer:</span>
              <Badge variant={isCorrect ? "default" : "destructive"}>{userChoice}</Badge>
            </div>
            {!isCorrect && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Correct answer:</span>
                <Badge variant="outline">{correctChoice}</Badge>
              </div>
            )}
          </div>
        )
      }

      default:
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">Answer: {userAnswer || "No answer"}</span>
          </div>
        )
    }
  }

  if (loading) return <Loading />

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => navigate("/quiz-list")} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Quizzes
              </Button>
              <Button onClick={() => navigate(`/quiz/${id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                View Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!result || !quiz) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground mb-6">We couldn't find any quiz results to display.</p>
            <Button onClick={() => navigate("/quiz-list")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scorePercentage = result.percentage || Math.round((result.score / result.totalPoints) * 100) || 0
  const scoreBadge = getScoreBadge(scorePercentage)
  const ScoreIcon = scoreBadge.icon

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <Button onClick={() => navigate("/quiz-list")} variant="ghost" className="mb-2 px-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quizzes
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Quiz Results</h1>
              <p className="text-muted-foreground">{quiz.title}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={shareResult} variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <QuizResultExport quiz={quiz} result={result} />
          <Button onClick={retakeQuiz} size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake Quiz
          </Button>
        </div>
      </div>

      {/* Score Overview */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <div className={`text-6xl font-bold ${getScoreColor(scorePercentage)}`}>{scorePercentage}%</div>
              <Badge variant={scoreBadge.variant} className="text-lg px-4 py-2">
                <ScoreIcon className="h-5 w-5 mr-2" />
                {scoreBadge.text}
              </Badge>
            </div>

            <div className="max-w-md mx-auto">
              <Progress value={scorePercentage} className="h-3" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold">Score</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {result.score}/{result.totalPoints}
                </p>
                <p className="text-sm text-muted-foreground">Points Earned</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">Time</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatTime(result.timeTaken || 0)}</p>
                <p className="text-sm text-muted-foreground">Total Time</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Award className="h-5 w-5 text-purple-500" />
                  <span className="font-semibold">Accuracy</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">{scorePercentage}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="questions">Question Review</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Question by Question Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {result.answers?.map((answerData, index) => {
                const isCorrect = answerData.isCorrect || false
                const pointsEarned = answerData.points || 0

                return (
                  <div key={index} className="border rounded-lg p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold">Question {index + 1}</span>
                          <Badge variant="outline">Question</Badge>
                        </div>
                        <div
                          className="text-muted-foreground mb-3"
                          dangerouslySetInnerHTML={{ __html: answerData.questionText }}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        {isCorrect ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-500" />
                        )}
                        <div className="text-right">
                          <p className="font-semibold">{pointsEarned} pts</p>
                          <p className="text-xs text-muted-foreground">earned</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Your answer:</span>
                          <Badge variant={isCorrect ? "default" : "destructive"}>
                            {answerData.selectedText || "No answer"}
                          </Badge>
                        </div>
                        {!isCorrect && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Correct answer:</span>
                            <Badge variant="outline">{answerData.correctText || "Unknown"}</Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {answerData.explanation && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Explanation:</h5>
                        <div
                          className="text-blue-800 dark:text-blue-200 text-sm"
                          dangerouslySetInnerHTML={{ __html: answerData.explanation }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Score</span>
                  <span className="font-semibold text-green-600">
                    {result.score} / {result.totalPoints}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Accuracy Rate</span>
                  <span className="font-semibold">{scorePercentage}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Time Spent</span>
                  <span className="font-semibold">{formatTime(result.timeTaken || 0)}</span>
                </div>
                {quiz.timeLimit && (
                  <div className="flex justify-between items-center">
                    <span>Time Limit</span>
                    <span className="font-semibold">{quiz.timeLimit} minutes</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Quiz Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Quiz Title</span>
                  <span className="font-semibold text-right max-w-[200px] truncate">{quiz.title}</span>
                </div>
                {quiz.category && (
                  <div className="flex justify-between items-center">
                    <span>Category</span>
                    <Badge variant="outline">{quiz.category}</Badge>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span>Total Questions</span>
                  <span className="font-semibold">{result.answers?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Completed At</span>
                  <span className="font-semibold text-sm">
                    {new Date(result.completedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Achievement/Feedback Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Performance Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                {scorePercentage >= 90 && (
                  <div className="p-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                      Outstanding Performance!
                    </h3>
                    <p className="text-green-700 dark:text-green-300">
                      Excellent work! You've demonstrated a strong understanding of the material.
                    </p>
                  </div>
                )}

                {scorePercentage >= 70 && scorePercentage < 90 && (
                  <div className="p-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <Star className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                    <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200 mb-2">Good Job!</h3>
                    <p className="text-blue-700 dark:text-blue-300">
                      Well done! You have a solid grasp of the concepts. Keep up the good work!
                    </p>
                  </div>
                )}

                {scorePercentage >= 50 && scorePercentage < 70 && (
                  <div className="p-6 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <Target className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
                    <h3 className="text-xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                      Room for Improvement
                    </h3>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      You're on the right track! Review the material and try again to improve your score.
                    </p>
                  </div>
                )}

                {scorePercentage < 50 && (
                  <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-red-600" />
                    <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">Keep Learning!</h3>
                    <p className="text-red-700 dark:text-red-300">
                      Don't give up! Review the material carefully and retake the quiz when you're ready.
                    </p>
                  </div>
                )}

                <div className="flex justify-center gap-4 mt-6">
                  <Button onClick={retakeQuiz} variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake Quiz
                  </Button>
                  <Button onClick={() => navigate("/quiz-list")}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    More Quizzes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
