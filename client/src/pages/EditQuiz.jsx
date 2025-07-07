"use client"

import { useState, useEffect, useContext } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { getAuth } from "firebase/auth"
import { AppContext } from "../context/AppContext"
import QuestionForm from "../components/QuestionForm"
import Loading from "../components/Loading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, X, Plus, Edit, Clock, FileText, Target, Calendar, User, AlertTriangle } from "lucide-react"

export default function EditQuiz() {
  const { id } = useParams()
  const { backendUrl } = useContext(AppContext)
  const navigate = useNavigate()
  const auth = getAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const [meta, setMeta] = useState({
    title: "",
    description: "",
    category: "",
    timeLimit: 0,
  })

  const TYPE_DEFAULT_OPTIONS = {
    mcq: [
      { text: "", image: null },
      { text: "", image: null },
    ],
    checkbox: [
      { text: "", image: null },
      { text: "", image: null },
    ],
    true_false: [
      { text: "True", image: null },
      { text: "False", image: null },
    ],
  }

  function typeDefaultCorrect(type) {
    switch (type) {
      case "mcq":
        return "0"
      case "checkbox":
        return []
      case "true_false":
        return "0"
      case "text_input":
        return [""]
      default:
        return ""
    }
  }

  const [questions, setQuestions] = useState([])
  const [originalQuiz, setOriginalQuiz] = useState(null)

  useEffect(() => {
    loadQuiz()
  }, [])

  const loadQuiz = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!auth.currentUser) {
        navigate("/login")
        return
      }

      const idToken = await auth.currentUser.getIdToken()
      const { data } = await axios.get(`${backendUrl}/api/quizzes/${id}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      })

      if (data.success) {
        const quiz = data.quiz
        const isOwner = quiz.creatorId === auth.currentUser.uid

        if (!isOwner) {
          setError("You don't have permission to edit this quiz.")
          return
        }

        setOriginalQuiz(quiz)
        setMeta({
          title: quiz.title || "",
          description: quiz.description || "",
          category: quiz.category || "",
          timeLimit: quiz.timeLimit || 0,
        })

        // Normalize questions to ensure consistent format
        const normalizedQuestions = (quiz.questions || []).map((question) => ({
          ...question,
          options: question.options
            ? question.options.map((opt) => (typeof opt === "string" ? { text: opt, image: null } : opt))
            : [],
          subQuestions: question.subQuestions
            ? question.subQuestions.map((subQ) => ({
                ...subQ,
                options: subQ.options
                  ? subQ.options.map((opt) => (typeof opt === "string" ? { text: opt, image: null } : opt))
                  : [],
              }))
            : [],
        }))

        setQuestions(normalizedQuestions)
      } else {
        setError(data.message || "Failed to load quiz")
      }
    } catch (err) {
      console.error("Error loading quiz:", err)
      if (err.response?.status === 401) {
        setError("Session expired. Please log in again.")
      } else if (err.response?.status === 404) {
        setError("Quiz not found")
      } else if (err.response?.status === 403) {
        setError("You don't have permission to edit this quiz")
      } else {
        setError("Failed to load quiz")
      }
    } finally {
      setLoading(false)
    }
  }

  const addQuestion = () => {
    const t = "mcq"
    setQuestions((prev) => [
      ...prev,
      {
        text: "",
        type: t,
        options: TYPE_DEFAULT_OPTIONS[t],
        correct: typeDefaultCorrect(t),
        points: 1,
        subQuestions: [],
        images: [],
        audio: null,
        explanation: "",
        allowPartialCredit: false,
        caseSensitive: false,
      },
    ])
  }

  const updateQuestion = (idx, upd) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === idx
          ? {
              ...q,
              ...upd,
              ...(upd.type && upd.type !== q.type
                ? {
                    options: TYPE_DEFAULT_OPTIONS[upd.type] || [],
                    correct: typeDefaultCorrect(upd.type),
                    subQuestions: upd.type === "paragraph" ? q.subQuestions || [] : [],
                  }
                : {}),
            }
          : q,
      ),
    )

  const removeQuestion = (idx) => setQuestions((prev) => prev.filter((_, i) => i !== idx))

  const duplicateQuestion = (idx) => {
    const questionToDuplicate = { ...questions[idx] }
    // Create a deep copy to avoid reference issues
    const duplicatedQuestion = {
      ...questionToDuplicate,
      options: questionToDuplicate.options ? [...questionToDuplicate.options] : [],
      subQuestions: questionToDuplicate.subQuestions ? [...questionToDuplicate.subQuestions] : [],
      images: questionToDuplicate.images ? [...questionToDuplicate.images] : [],
    }

    setQuestions((prev) => {
      const newQuestions = [...prev]
      newQuestions.splice(idx + 1, 0, duplicatedQuestion)
      return newQuestions
    })
  }

  const handleMeta = (field, val) => setMeta((m) => ({ ...m, [field]: val }))

  // Helper function to get option text
  const getOptionText = (option) => {
    if (typeof option === "string") return option
    if (typeof option === "object" && option !== null) return option.text || ""
    return ""
  }

  // Helper function to validate sub-questions
  const validateSubQuestions = (subQuestions, questionIndex) => {
    if (!Array.isArray(subQuestions)) return true

    for (let j = 0; j < subQuestions.length; j++) {
      const subQ = subQuestions[j]

      if (!subQ.text || !subQ.text.trim()) {
        alert(`Question ${questionIndex + 1}, Sub-question ${j + 1}: text required.`)
        return false
      }

      if (subQ.points < 1) {
        alert(`Question ${questionIndex + 1}, Sub-question ${j + 1}: points ≥ 1.`)
        return false
      }

      if (subQ.type === "mcq" || subQ.type === "checkbox") {
        if (!subQ.options || subQ.options.length < 2) {
          alert(`Question ${questionIndex + 1}, Sub-question ${j + 1}: ≥2 options required.`)
          return false
        }

        const hasEmptyOptions = subQ.options.some((opt) => !getOptionText(opt).trim())
        if (hasEmptyOptions) {
          alert(`Question ${questionIndex + 1}, Sub-question ${j + 1}: no empty options allowed.`)
          return false
        }

        if (subQ.type === "mcq") {
          if (isNaN(Number.parseInt(subQ.correct, 10))) {
            alert(`Question ${questionIndex + 1}, Sub-question ${j + 1}: select one correct answer.`)
            return false
          }
        } else if (subQ.type === "checkbox") {
          if (!Array.isArray(subQ.correct) || subQ.correct.length === 0) {
            alert(`Question ${questionIndex + 1}, Sub-question ${j + 1}: select at least one correct answer.`)
            return false
          }
        }
      }

      if (subQ.type === "true_false") {
        if (subQ.correct !== "0" && subQ.correct !== "1") {
          alert(`Question ${questionIndex + 1}, Sub-question ${j + 1}: select True or False.`)
          return false
        }
      }

      if (subQ.type === "text_input") {
        if (!subQ.correct || (Array.isArray(subQ.correct) && subQ.correct.length === 0)) {
          alert(`Question ${questionIndex + 1}, Sub-question ${j + 1}: provide at least one correct answer.`)
          return false
        }
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!meta.title.trim()) return alert("Please enter a title.")
    if (questions.length === 0) return alert("Add at least one question.")

    // Enhanced validation
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]

      if (!q.text || !q.text.trim()) {
        alert(`Question ${i + 1}: text required.`)
        return
      }

      if (q.points < 1) {
        alert(`Question ${i + 1}: points ≥ 1.`)
        return
      }

      // Validate based on question type
      if (q.type === "mcq") {
        if (!q.options || q.options.length < 2) {
          alert(`Question ${i + 1}: ≥2 options required.`)
          return
        }

        const hasEmptyOptions = q.options.some((opt) => !getOptionText(opt).trim())
        if (hasEmptyOptions) {
          alert(`Question ${i + 1}: no empty options allowed.`)
          return
        }

        if (isNaN(Number.parseInt(q.correct, 10))) {
          alert(`Question ${i + 1}: select one correct answer.`)
          return
        }
      }

      if (q.type === "checkbox") {
        if (!q.options || q.options.length < 2) {
          alert(`Question ${i + 1}: ≥2 options required.`)
          return
        }

        const hasEmptyOptions = q.options.some((opt) => !getOptionText(opt).trim())
        if (hasEmptyOptions) {
          alert(`Question ${i + 1}: no empty options allowed.`)
          return
        }

        if (!Array.isArray(q.correct) || q.correct.length === 0) {
          alert(`Question ${i + 1}: select at least one correct answer.`)
          return
        }
      }

      if (q.type === "true_false") {
        if (q.correct !== "0" && q.correct !== "1") {
          alert(`Question ${i + 1}: select True or False.`)
          return
        }
      }

      if (q.type === "text_input") {
        if (!q.correct || (Array.isArray(q.correct) && q.correct.length === 0)) {
          alert(`Question ${i + 1}: provide at least one correct answer.`)
          return
        }
      }

      if (q.type === "paragraph") {
        if (!q.subQuestions || q.subQuestions.length === 0) {
          alert(`Question ${i + 1}: paragraph questions must have at least one sub-question.`)
          return
        }

        if (!validateSubQuestions(q.subQuestions, i)) {
          return
        }
      }
    }

    try {
      setSaving(true)
      const idToken = await auth.currentUser.getIdToken()

      const payload = {
        title: meta.title,
        description: meta.description,
        category: meta.category,
        timeLimit: meta.timeLimit,
        questions,
      }

      const { data } = await axios.put(`${backendUrl}/api/quizzes/${id}`, payload, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
      })

      if (data.success) {
        alert("Quiz updated successfully!")
        navigate(`/quiz/${id}/detail`)
      } else {
        alert(data.message || "Quiz update failed.")
      }
    } catch (err) {
      console.error("Error updating quiz:", err)
      if (err.response?.status === 401) {
        alert("Session expired. Please log in again.")
        navigate("/login")
      } else if (err.response?.status === 403) {
        alert("You don't have permission to edit this quiz.")
      } else {
        alert("Error updating quiz. Please try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  const totalPoints = questions.reduce((sum, q) => {
    if (q.type === "paragraph" && q.subQuestions) {
      return sum + q.subQuestions.reduce((subSum, subQ) => subSum + (subQ.points || 0), 0)
    }
    return sum + (q.points || 0)
  }, 0)

  if (loading) return <Loading />

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Quiz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={loadQuiz} variant="destructive">
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
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button onClick={() => navigate("/my-quizzes")} variant="ghost" className="mb-2 px-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Quizzes
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Edit className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Edit Quiz</h1>
              <p className="text-muted-foreground">Update your quiz content and settings</p>
            </div>
          </div>
        </div>

        {questions.length > 0 && (
          <div className="flex gap-2">
            <Badge variant="secondary">
              <FileText className="h-3 w-3 mr-1" />
              {questions.length} Questions
            </Badge>
            <Badge variant="secondary">
              <Target className="h-3 w-3 mr-1" />
              {totalPoints} Points
            </Badge>
            {meta.timeLimit > 0 && (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                {meta.timeLimit} min
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Original Quiz Info */}
      {originalQuiz && (
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">
                <strong>Editing:</strong> {originalQuiz.title}
              </span>
              <span className="text-blue-600 dark:text-blue-400 text-sm">
                (Created: {new Date(originalQuiz.createdAt).toLocaleDateString()})
              </span>
              <User className="h-4 w-4 ml-2" />
              <span className="text-sm">by {originalQuiz.creatorName}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quiz Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter quiz title"
                  value={meta.title}
                  onChange={(e) => handleMeta("title", e.target.value)}
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Science, History, Math"
                  value={meta.category}
                  onChange={(e) => handleMeta("category", e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this quiz is about..."
                value={meta.description}
                onChange={(e) => handleMeta("description", e.target.value)}
                disabled={saving}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                min={0}
                placeholder="0 for no time limit"
                value={meta.timeLimit}
                onChange={(e) => handleMeta("timeLimit", Number.parseInt(e.target.value, 10) || 0)}
                disabled={saving}
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">Set to 0 for unlimited time</p>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Questions ({questions.length})</CardTitle>
                <p className="text-sm text-muted-foreground">Manage your quiz questions</p>
              </div>
              <Button type="button" onClick={addQuestion} disabled={saving} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No questions yet</h3>
                <p className="text-muted-foreground mb-4">Add questions to update your quiz</p>
                <Button onClick={addQuestion} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Question
                </Button>
              </div>
            ) : (
              questions.map((q, idx) => (
                <QuestionForm
                  key={idx}
                  index={idx}
                  question={q}
                  onUpdate={updateQuestion}
                  onDelete={removeQuestion}
                  onDuplicate={duplicateQuestion}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(`/quiz/${id}/detail`)} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={saving || questions.length === 0} className="min-w-[140px]">
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Quiz
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
