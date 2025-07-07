"use client"

import { useState, useEffect, useContext, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { AppContext } from "../context/AppContext"
import QuestionDisplay from "../components/QuestionDisplay"
import Loading from "../components/Loading"
import { getAuth } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, ArrowLeft, ArrowRight, Send, LogOut, AlertTriangle, CheckCircle } from "lucide-react"

export default function QuizPlay() {
  const { id } = useParams()
  const keys = {
    startTime: `quiz-start-${id}`,
    state: `quiz-state-${id}`,
  }
  const navigate = useNavigate()
  const { backendUrl } = useContext(AppContext)
  const auth = getAuth()
  const [quiz, setQuiz] = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const timerRef = useRef()

  // Fetch quiz
  useEffect(() => {
    axios
      .get(`${backendUrl}/api/quizzes/${id}`)
      .then(({ data }) => {
        if (data.success) {
          setQuiz(data.quiz)
          if (data.quiz.timeLimit > 0) {
            const storedStart = localStorage.getItem(keys.startTime)
            const now = Date.now()

            if (!storedStart) {
              localStorage.setItem(keys.startTime, now)
              setTimeLeft(data.quiz.timeLimit * 60)
            } else {
              const elapsed = Math.floor((now - Number.parseInt(storedStart)) / 1000)
              const remaining = Math.max(data.quiz.timeLimit * 60 - elapsed, 0)
              setTimeLeft(remaining)
            }
          }

          const savedState = localStorage.getItem(keys.state)
          if (savedState) {
            try {
              const parsed = JSON.parse(savedState)
              if (parsed.answers) setAnswers(parsed.answers)
              if (typeof parsed.currentIdx === "number") setCurrentIdx(parsed.currentIdx)
            } catch (err) {
              // Silent fail for corrupted saved state
            }
          }
        }
      })
      .catch(() => navigate(`/quiz/${id}/detail`))
  }, [backendUrl, id, navigate])

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/")
    }
  }, [auth.currentUser, navigate])

  // Timer countdown
  useEffect(() => {
    if (timeLeft == null || isSubmitting) return
    if (timeLeft <= 0) {
      handleSubmit()
      return
    }
    timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timeLeft, isSubmitting])

  useEffect(() => {
    if (!isSubmitting) {
      const data = { answers, currentIdx }
      localStorage.setItem(keys.state, JSON.stringify(data))
    }
  }, [answers, currentIdx, isSubmitting])

  if (!quiz) return <Loading />

  const total = quiz.questions.length
  const current = quiz.questions[currentIdx]
  const progress = ((currentIdx + 1) / total) * 100
  const answeredCount = Object.keys(answers).filter((key) => {
    const answer = answers[key]
    const question = quiz.questions[key]

    if (answer === undefined || answer === null || answer === "") return false

    switch (question?.type) {
      case "checkbox":
        return Array.isArray(answer) && answer.length > 0
      case "paragraph":
        if (typeof answer === "object" && answer !== null) {
          return Object.values(answer).some((subAns) => subAns !== undefined && subAns !== null && subAns !== "")
        }
        return false
      case "text_input":
        return String(answer).trim().length > 0
      default:
        return true
    }
  }).length

  const selectAnswer = (questionIndex, val) => {
    setAnswers((prevAnswers) => {
      const newAnswers = { ...prevAnswers, [questionIndex]: val }
      return newAnswers
    })
  }

  const getStatusVariant = (i) => {
    if (i === currentIdx) return "default"

    const answer = answers[i]
    const question = quiz.questions[i]

    if (answer === undefined || answer === null || answer === "") {
      return "outline"
    }

    switch (question?.type) {
      case "checkbox":
        return Array.isArray(answer) && answer.length > 0 ? "secondary" : "outline"
      case "paragraph":
        if (typeof answer === "object" && answer !== null) {
          const hasSubAnswers = Object.values(answer).some(
            (subAns) => subAns !== undefined && subAns !== null && subAns !== "",
          )
          return hasSubAnswers ? "secondary" : "outline"
        }
        return "outline"
      case "text_input":
        return String(answer).trim().length > 0 ? "secondary" : "outline"
      default:
        return "secondary"
    }
  }

  const getQuestionStatus = (i) => {
    const answer = answers[i]
    const question = quiz.questions[i]

    if (answer === undefined || answer === null || answer === "") {
      return "unanswered"
    }

    switch (question?.type) {
      case "checkbox":
        return Array.isArray(answer) && answer.length > 0 ? "answered" : "unanswered"
      case "paragraph":
        if (typeof answer === "object" && answer !== null) {
          const subAnswers = Object.values(answer)
          return subAnswers.some((subAns) => subAns !== undefined && subAns !== null && subAns !== "")
            ? "answered"
            : "unanswered"
        }
        return "unanswered"
      case "text_input":
        return String(answer).trim().length > 0 ? "answered" : "unanswered"
      default:
        return "answered"
    }
  }

  const goPrev = () => currentIdx > 0 && setCurrentIdx(currentIdx - 1)
  const goNext = () => currentIdx < total - 1 && setCurrentIdx(currentIdx + 1)

  const handleSubmitClick = () => {
    setShowSubmitConfirm(true)
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    const fbUser = auth.currentUser
    if (!fbUser) {
      navigate("/")
      return
    }

    try {
      setIsSubmitting(true)
      setShowSubmitConfirm(false)

      // Stop the timer immediately
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      const idToken = await fbUser.getIdToken(true)
      const totalTime = quiz.timeLimit * 60
      const timeTaken = timeLeft !== null ? totalTime - timeLeft : 0

      const processedAnswers = {}
      quiz.questions.forEach((question, index) => {
        const userAnswer = answers[index]

        if (userAnswer !== undefined && userAnswer !== null && userAnswer !== "") {
          // Handle different question types
          switch (question.type) {
            case "mcq":
            case "true_false":
              processedAnswers[index] = String(userAnswer)
              break
            case "checkbox":
              processedAnswers[index] = Array.isArray(userAnswer) ? userAnswer : []
              break
            case "text_input":
              processedAnswers[index] = String(userAnswer).trim()
              break
            case "paragraph":
              processedAnswers[index] = userAnswer || {}
              break
            default:
              processedAnswers[index] = userAnswer
          }
        } else {
          // Set appropriate default for unanswered questions
          switch (question.type) {
            case "checkbox":
              processedAnswers[index] = []
              break
            case "paragraph":
              processedAnswers[index] = {}
              break
            default:
              processedAnswers[index] = null
          }
        }
      })

      const requestData = { answers: processedAnswers, timeTaken }
      const requestConfig = {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      }

      const { data } = await axios.post(`${backendUrl}/api/quizzes/${id}/attempt`, requestData, requestConfig)

      if (data.success) {
        localStorage.removeItem(keys.startTime)
        localStorage.removeItem(keys.state)
        return navigate(`/quiz/${id}/result/${data.attemptId}`)
      } else {
        setIsSubmitting(false)
      }
    } catch (err) {
      setIsSubmitting(false)
      if (err.response?.status === 401) {
        return navigate("/")
      }
    }
  }

  const handleExit = () => {
    setShowExitConfirm(true)
  }

  const confirmExit = () => {
    localStorage.removeItem(keys.startTime)
    localStorage.removeItem(keys.state)
    navigate(`/quiz/${id}/detail`)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getTimeColor = () => {
    if (timeLeft === null) return "text-muted-foreground"
    if (timeLeft < 60) return "text-destructive"
    if (timeLeft < 300) return "text-yellow-600"
    return "text-muted-foreground"
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        {/* Enhanced Sidebar */}
        <aside className="w-80 bg-card border-r border-border p-6 flex flex-col">
          {/* Quiz Info */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg truncate">{quiz.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Questions</span>
                <Badge variant="outline">{total}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Answered</span>
                <Badge variant={answeredCount === total ? "default" : "secondary"}>
                  {answeredCount}/{total}
                </Badge>
              </div>
              {quiz.timeLimit > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time Limit</span>
                  <Badge variant="outline">{quiz.timeLimit} min</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timer */}
          {timeLeft !== null && (
            <Card className="mb-6">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className={`h-4 w-4 ${getTimeColor()}`} />
                  <span className="text-sm font-medium text-muted-foreground">Time Remaining</span>
                </div>
                <div className={`text-2xl font-mono font-bold ${getTimeColor()}`}>
                  {isSubmitting ? "Submitting..." : formatTime(timeLeft)}
                </div>
                {timeLeft < 300 && !isSubmitting && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {timeLeft < 60 ? "Less than a minute left!" : "Less than 5 minutes left"}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {currentIdx + 1} of {total}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{answeredCount} answered</span>
                  <span>{Math.round(progress)}% complete</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Question Navigation */}
          <Card className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Questions
                <div className="flex gap-1">
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Current</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    <span>Answered</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                {Array.from({ length: total }).map((_, i) => {
                  const status = getQuestionStatus(i)
                  const isCurrent = i === currentIdx

                  return (
                    <Button
                      key={i}
                      variant={getStatusVariant(i)}
                      size="sm"
                      className={`h-10 w-10 p-0 text-xs font-semibold relative ${
                        isCurrent ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}
                      onClick={() => setCurrentIdx(i)}
                      disabled={isSubmitting}
                    >
                      {i + 1}
                      {status === "answered" && !isCurrent && (
                        <CheckCircle className="absolute -top-1 -right-1 h-3 w-3 text-green-600 bg-background rounded-full" />
                      )}
                    </Button>
                  )
                })}
              </div>

              {/* Question Navigation Summary */}
              <div className="mt-4 pt-3 border-t space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Unanswered: {total - answeredCount}</span>
                  <span>Remaining: {total - currentIdx - 1}</span>
                </div>
                {answeredCount < total && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {total - answeredCount} questions still need answers
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Exit Button */}
          <Button variant="outline" onClick={handleExit} className="mt-4 w-full bg-transparent" disabled={isSubmitting}>
            <LogOut className="h-4 w-4 mr-2" />
            Exit Quiz
          </Button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Enhanced Header */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    Question {currentIdx + 1} of {total}
                  </CardTitle>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <Badge variant="outline">
                      {current?.type === "mcq"
                        ? "Multiple Choice"
                        : current?.type === "checkbox"
                          ? "Multiple Select"
                          : current?.type === "true_false"
                            ? "True/False"
                            : current?.type === "text_input"
                              ? "Text Input"
                              : current?.type === "paragraph"
                                ? "Paragraph"
                                : "Question"}
                    </Badge>
                    {current?.points && (
                      <Badge variant="secondary">
                        {current.points} {current.points === 1 ? "point" : "points"}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={getQuestionStatus(currentIdx) === "answered" ? "default" : "destructive"}>
                    {getQuestionStatus(currentIdx) === "answered" ? "Answered" : "Not Answered"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Question Display */}
          <QuestionDisplay
            question={current}
            questionIndex={currentIdx}
            answer={answers[currentIdx]}
            onAnswerChange={selectAnswer}
            isReviewMode={isSubmitting}
          />

          {/* Enhanced Navigation */}
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={goPrev} disabled={currentIdx === 0 || isSubmitting}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                {isSubmitting ? (
                  <div className="flex items-center gap-2 text-primary">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Submitting quiz...
                  </div>
                ) : getQuestionStatus(currentIdx) === "answered" ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Answer recorded
                  </div>
                ) : (
                  "Select an answer to continue"
                )}
              </div>
            </div>

            {currentIdx < total - 1 ? (
              <Button onClick={goNext} disabled={isSubmitting}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmitClick} variant="destructive" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Quiz
                  </>
                )}
              </Button>
            )}
          </div>
        </main>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle>Submit Quiz?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to submit your quiz? You have answered {answeredCount} out of {total} questions.
                {answeredCount < total && " You can still go back and answer the remaining questions."}
              </p>
              <div className="flex justify-end gap-3">
                <Button onClick={() => setShowSubmitConfirm(false)} variant="outline">
                  Continue Quiz
                </Button>
                <Button onClick={handleSubmit} variant="destructive">
                  Submit Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle>Exit Quiz?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to exit? Your progress will be saved and you can continue later.
              </p>
              <div className="flex justify-end gap-3">
                <Button onClick={() => setShowExitConfirm(false)} variant="outline">
                  Continue Quiz
                </Button>
                <Button onClick={confirmExit} variant="destructive">
                  Exit Quiz
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
