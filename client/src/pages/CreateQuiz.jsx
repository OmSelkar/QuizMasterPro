"use client"
import { useState, useContext } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import QuestionForm from "../components/QuestionForm"
import TiptapEditor from "../components/TiptapEditor"
import { Plus, Save, Eye, EyeOff, Settings, Calendar, HelpCircle, Shuffle, Clock, Users } from "lucide-react"

export default function CreateQuiz() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState({
    title: "",
    description: "",
    category: "",
    timeLimit: 0,
    questions: [],
    isPublic: true,
    allowRetakes: true,
    showCorrectAnswers: true,
    randomizeQuestions: false,
    randomizeOptions: false,
    isScheduled: false,
    scheduledStart: "",
    scheduledEnd: "",
  })

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showScheduling, setShowScheduling] = useState(false)
  const [useRichDescription, setUseRichDescription] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addQuestion = () => {
    const newQuestion = {
      text: "",
      type: "mcq",
      options: [
        { text: "", image: null },
        { text: "", image: null },
      ],
      correct: "0",
      points: 1,
      images: [],
      audio: null,
      explanation: "",
      subQuestions: [],
      allowPartialCredit: false,
      caseSensitive: false,
      isScheduled: false,
      scheduledStart: "",
      scheduledEnd: "",
    }
    setQuiz((prev) => ({ ...prev, questions: [...prev.questions, newQuestion] }))
  }

  const updateQuestion = (index, updates) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? { ...q, ...updates } : q)),
    }))
  }

  const removeQuestion = (index) => {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      alert("Please log in to create a quiz")
      return
    }

    if (quiz.questions.length === 0) {
      alert("Please add at least one question")
      return
    }

    // Validate questions
    for (let i = 0; i < quiz.questions.length; i++) {
      const q = quiz.questions[i]
      if (!q.text.trim()) {
        alert(`Question ${i + 1} is missing text`)
        return
      }

      if (q.type === "mcq" || q.type === "checkbox" || q.type === "true_false") {
        if (!q.options || q.options.length < 2) {
          alert(`Question ${i + 1} needs at least 2 options`)
          return
        }

        // Check if options have text
        for (let j = 0; j < q.options.length; j++) {
          const option = q.options[j]
          const optionText = typeof option === "string" ? option : option.text
          if (!optionText.trim()) {
            alert(`Question ${i + 1}, Option ${j + 1} is missing text`)
            return
          }
        }

        // Validate correct answers
        if (q.type === "mcq" || q.type === "true_false") {
          if (q.correct === "" || q.correct === null || q.correct === undefined) {
            alert(`Question ${i + 1} is missing a correct answer`)
            return
          }
        } else if (q.type === "checkbox") {
          if (!Array.isArray(q.correct) || q.correct.length === 0) {
            alert(`Question ${i + 1} needs at least one correct answer`)
            return
          }
        }
      } else if (q.type === "text_input") {
        if (!Array.isArray(q.correct) || q.correct.length === 0 || !q.correct[0].trim()) {
          alert(`Question ${i + 1} is missing correct answer(s)`)
          return
        }
      } else if (q.type === "paragraph") {
        if (!q.subQuestions || q.subQuestions.length === 0) {
          alert(`Question ${i + 1} (paragraph) needs at least one sub-question`)
          return
        }

        // Validate sub-questions
        for (let j = 0; j < q.subQuestions.length; j++) {
          const subQ = q.subQuestions[j]
          if (!subQ.text.trim()) {
            alert(`Question ${i + 1}, Sub-question ${j + 1} is missing text`)
            return
          }
        }
      }
    }

    setIsSubmitting(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch("http://localhost:5000/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...quiz,
          creatorId: user.uid,
          creatorName: user.displayName || user.email || "Anonymous",
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert("Quiz created successfully!")
        navigate("/my-quizzes")
      } else {
        alert(data.message || "Failed to create quiz")
      }
    } catch (error) {
      console.error("Error creating quiz:", error)
      alert("Error creating quiz. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const categories = [
    "General Knowledge",
    "Science",
    "History",
    "Geography",
    "Literature",
    "Mathematics",
    "Technology",
    "Sports",
    "Entertainment",
    "Business",
    "Health",
    "Art",
    "Music",
    "Other",
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Quiz</h1>
        <p className="text-muted-foreground">
          Build an engaging quiz with multiple question types, media support, and advanced settings.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Quiz Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Quiz Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Quiz Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter quiz title"
                  value={quiz.title}
                  onChange={(e) => setQuiz((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={quiz.category}
                  onChange={(e) => setQuiz((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                <div className="flex items-center space-x-2">
                  <Switch checked={useRichDescription} onCheckedChange={setUseRichDescription} />
                  <Label className="text-sm">Rich Text</Label>
                </div>
              </div>

              {useRichDescription ? (
                <TiptapEditor
                  content={quiz.description}
                  onChange={(content) => setQuiz((prev) => ({ ...prev, description: content }))}
                  placeholder="Describe your quiz..."
                />
              ) : (
                <Textarea
                  id="description"
                  placeholder="Describe your quiz (optional)"
                  value={quiz.description}
                  onChange={(e) => setQuiz((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Limit (minutes)
              </Label>
              <Input
                id="timeLimit"
                type="number"
                placeholder="0 = No time limit"
                value={quiz.timeLimit}
                onChange={(e) => setQuiz((prev) => ({ ...prev, timeLimit: Number.parseInt(e.target.value) || 0 }))}
                min={0}
                max={300}
              />
              <p className="text-sm text-muted-foreground">Set to 0 for no time limit</p>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Scheduling */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Quiz Scheduling (Optional)
              </CardTitle>
              <Button type="button" onClick={() => setShowScheduling(!showScheduling)} size="sm" variant="ghost">
                {showScheduling ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showScheduling ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>

          {showScheduling && (
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={quiz.isScheduled}
                  onCheckedChange={(checked) => setQuiz((prev) => ({ ...prev, isScheduled: checked }))}
                />
                <Label>Enable quiz scheduling</Label>
              </div>

              {quiz.isScheduled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <Label>Available From</Label>
                    <Input
                      type="datetime-local"
                      value={quiz.scheduledStart}
                      onChange={(e) => setQuiz((prev) => ({ ...prev, scheduledStart: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Available Until</Label>
                    <Input
                      type="datetime-local"
                      value={quiz.scheduledEnd}
                      onChange={(e) => setQuiz((prev) => ({ ...prev, scheduledEnd: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Advanced Settings
              </CardTitle>
              <Button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                size="sm"
                variant="ghost"
              >
                {showAdvancedSettings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showAdvancedSettings ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>

          {showAdvancedSettings && (
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Access & Participation
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Public Quiz</Label>
                        <p className="text-sm text-muted-foreground">Anyone can find and take this quiz</p>
                      </div>
                      <Switch
                        checked={quiz.isPublic}
                        onCheckedChange={(checked) => setQuiz((prev) => ({ ...prev, isPublic: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Allow Retakes</Label>
                        <p className="text-sm text-muted-foreground">Users can retake the quiz multiple times</p>
                      </div>
                      <Switch
                        checked={quiz.allowRetakes}
                        onCheckedChange={(checked) => setQuiz((prev) => ({ ...prev, allowRetakes: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Show Correct Answers</Label>
                        <p className="text-sm text-muted-foreground">Display correct answers after completion</p>
                      </div>
                      <Switch
                        checked={quiz.showCorrectAnswers}
                        onCheckedChange={(checked) => setQuiz((prev) => ({ ...prev, showCorrectAnswers: checked }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shuffle className="w-4 h-4" />
                    Randomization
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Randomize Questions</Label>
                        <p className="text-sm text-muted-foreground">Show questions in random order</p>
                      </div>
                      <Switch
                        checked={quiz.randomizeQuestions}
                        onCheckedChange={(checked) => setQuiz((prev) => ({ ...prev, randomizeQuestions: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Randomize Options</Label>
                        <p className="text-sm text-muted-foreground">Shuffle answer options for each question</p>
                      </div>
                      <Switch
                        checked={quiz.randomizeOptions}
                        onCheckedChange={(checked) => setQuiz((prev) => ({ ...prev, randomizeOptions: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Questions Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Questions ({quiz.questions.length})
              </CardTitle>
              <Button type="button" onClick={addQuestion} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {quiz.questions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <HelpCircle className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-medium text-muted-foreground mb-2">No questions yet</h3>
                <p className="text-muted-foreground mb-6">Start building your quiz by adding your first question</p>
                <Button onClick={addQuestion} variant="outline" size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Add First Question
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {quiz.questions.map((question, index) => (
                  <QuestionForm
                    key={index}
                    index={index}
                    question={question}
                    onChange={(updates) => updateQuestion(index, updates)}
                    onRemove={() => removeQuestion(index)}
                  />
                ))}

                {/* Add Question Button at Bottom */}
                <div className="flex justify-center pt-4">
                  <Button type="button" onClick={addQuestion} variant="outline" size="lg">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Another Question
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-medium">Ready to publish?</h3>
                <p className="text-sm text-muted-foreground">
                  {quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} •{" "}
                  {quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0)} total points
                  {quiz.timeLimit > 0 && ` • ${quiz.timeLimit} minute time limit`}
                </p>
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate("/my-quizzes")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || quiz.questions.length === 0}>
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Quiz
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
