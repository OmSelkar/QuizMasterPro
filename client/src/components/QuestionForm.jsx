"use client"
import { useState, useRef } from "react"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import TiptapEditor from "./TiptapEditor"
import { Trash2, Plus, X, ImageIcon, Volume2, HelpCircle, Eye, EyeOff, Calendar } from "lucide-react"

export default function QuestionForm({ index, question, onChange, onRemove }) {
  const {
    text = "",
    type = "mcq",
    options = [],
    correct = "",
    points = 1,
    images = [],
    audio = null,
    explanation = "",
    subQuestions = [],
    allowPartialCredit = false,
    caseSensitive = false,
    scheduledStart = "",
    scheduledEnd = "",
    isScheduled = false,
  } = question

  const [showExplanation, setShowExplanation] = useState(false)
  const [showScheduling, setShowScheduling] = useState(false)
  const [useRichText, setUseRichText] = useState(false)
  const imageInputRef = useRef(null)
  const audioInputRef = useRef(null)

  const setField = (field, value) => onChange({ [field]: value })

  // Initialize options based on question type
  const initializeOptions = (questionType) => {
    switch (questionType) {
      case "mcq":
      case "checkbox":
        return [
          { text: "", image: null },
          { text: "", image: null },
        ]
      case "true_false":
        return [
          { text: "True", image: null },
          { text: "False", image: null },
        ]
      default:
        return []
    }
  }

  const initializeCorrect = (questionType) => {
    switch (questionType) {
      case "mcq":
      case "true_false":
        return "0"
      case "checkbox":
        return []
      case "text_input":
        return [""] // Initialize with one empty answer
      default:
        return ""
    }
  }

  const handleTypeChange = (newType) => {
    const updates = {
      type: newType,
      options: initializeOptions(newType),
      correct: initializeCorrect(newType),
    }

    // Clear sub-questions if not paragraph type
    if (newType !== "paragraph") {
      updates.subQuestions = []
    } else {
      // Initialize with one sub-question for paragraph type
      if (!subQuestions || subQuestions.length === 0) {
        updates.subQuestions = [
          {
            text: "",
            type: "mcq",
            options: [
              { text: "", image: null },
              { text: "", image: null },
            ],
            correct: "0",
            points: 1,
          },
        ]
      }
    }

    onChange(updates)
  }

  const addOption = () => {
    setField("options", [...options, { text: "", image: null }])
  }

  const updateOption = (i, field, value) => {
    const newOptions = [...options]
    if (typeof newOptions[i] === "string") {
      newOptions[i] = { text: newOptions[i], image: null }
    }
    newOptions[i][field] = value
    setField("options", newOptions)
  }

  const removeOption = (i) => {
    const newOptions = options.filter((_, idx) => idx !== i)
    setField("options", newOptions)

    // Update correct answers if needed
    if (type === "mcq" && Number.parseInt(correct) === i) {
      setField("correct", "0")
    } else if (type === "checkbox") {
      const newCorrect = correct
        .filter((idx) => Number.parseInt(idx) !== i)
        .map((idx) => (Number.parseInt(idx) > i ? String(Number.parseInt(idx) - 1) : idx))
      setField("correct", newCorrect)
    }
  }

  // Text input answer management
  const addTextAnswer = () => {
    const currentAnswers = Array.isArray(correct) ? correct : []
    if (currentAnswers.length < 7) {
      setField("correct", [...currentAnswers, ""])
    }
  }

  const updateTextAnswer = (i, value) => {
    const currentAnswers = Array.isArray(correct) ? [...correct] : []
    currentAnswers[i] = value
    setField("correct", currentAnswers)
  }

  const removeTextAnswer = (i) => {
    const currentAnswers = Array.isArray(correct) ? correct : []
    const newAnswers = currentAnswers.filter((_, idx) => idx !== i)
    setField("correct", newAnswers.length > 0 ? newAnswers : [""])
  }

  const addSubQuestion = () => {
    setField("subQuestions", [
      ...subQuestions,
      {
        text: "",
        type: "mcq",
        options: [
          { text: "", image: null },
          { text: "", image: null },
        ],
        correct: "0",
        points: 1,
      },
    ])
  }

  const updateSubQuestion = (i, field, value) => {
    const newSubQuestions = [...subQuestions]
    newSubQuestions[i][field] = value
    setField("subQuestions", newSubQuestions)
  }

  const removeSubQuestion = (i) => {
    setField(
      "subQuestions",
      subQuestions.filter((_, idx) => idx !== i),
    )
  }

  const addSubQuestionOption = (subIndex) => {
    const newSubQuestions = [...subQuestions]
    newSubQuestions[subIndex].options.push({ text: "", image: null })
    setField("subQuestions", newSubQuestions)
  }

  const removeSubQuestionOption = (subIndex, optionIndex) => {
    const newSubQuestions = [...subQuestions]
    newSubQuestions[subIndex].options = newSubQuestions[subIndex].options.filter((_, idx) => idx !== optionIndex)

    // Update correct answer if the removed option was selected
    if (
      newSubQuestions[subIndex].type === "mcq" &&
      Number.parseInt(newSubQuestions[subIndex].correct) === optionIndex
    ) {
      newSubQuestions[subIndex].correct = "0"
    } else if (newSubQuestions[subIndex].type === "checkbox") {
      const currentCorrect = Array.isArray(newSubQuestions[subIndex].correct) ? newSubQuestions[subIndex].correct : []
      newSubQuestions[subIndex].correct = currentCorrect
        .filter((idx) => Number.parseInt(idx) !== optionIndex)
        .map((idx) => (Number.parseInt(idx) > optionIndex ? String(Number.parseInt(idx) - 1) : idx))
    }

    setField("subQuestions", newSubQuestions)
  }

  const updateSubQuestionOption = (subIndex, optionIndex, field, value) => {
    const newSubQuestions = [...subQuestions]
    if (typeof newSubQuestions[subIndex].options[optionIndex] === "string") {
      newSubQuestions[subIndex].options[optionIndex] = {
        text: newSubQuestions[subIndex].options[optionIndex],
        image: null,
      }
    }
    newSubQuestions[subIndex].options[optionIndex][field] = value
    setField("subQuestions", newSubQuestions)
  }

  const toggleCheckbox = (i) => {
    const strIdx = String(i)
    let arr = Array.isArray(correct) ? [...correct] : []
    if (arr.includes(strIdx)) {
      arr = arr.filter((c) => c !== strIdx)
    } else {
      arr.push(strIdx)
    }
    setField("correct", arr)
  }

  const toggleSubQuestionCheckbox = (subIndex, optionIndex) => {
    const newSubQuestions = [...subQuestions]
    const subQ = newSubQuestions[subIndex]

    if (subQ.type === "checkbox") {
      const strIdx = String(optionIndex)
      let arr = Array.isArray(subQ.correct) ? [...subQ.correct] : []
      if (arr.includes(strIdx)) {
        arr = arr.filter((c) => c !== strIdx)
      } else {
        arr.push(strIdx)
      }
      newSubQuestions[subIndex].correct = arr
    } else {
      newSubQuestions[subIndex].correct = String(optionIndex)
    }

    setField("subQuestions", newSubQuestions)
  }

  const handleImageUpload = (file, target, targetIndex = null) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (target === "question") {
          const newImages = [...images, e.target.result]
          setField("images", newImages)
        } else if (target === "option") {
          updateOption(targetIndex, "image", e.target.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const removeQuestionImage = (imageIndex) => {
    const newImages = images.filter((_, idx) => idx !== imageIndex)
    setField("images", newImages)
  }

  const handleAudioUpload = (file) => {
    if (file && file.type.startsWith("audio/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setField("audio", e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const questionTypes = [
    { value: "mcq", label: "Multiple Choice", icon: "◉", description: "Single correct answer" },
    { value: "checkbox", label: "Multiple Select", icon: "☑", description: "Multiple correct answers" },
    { value: "true_false", label: "True / False", icon: "✓", description: "True or false question" },
    { value: "text_input", label: "Text Input", icon: "📝", description: "User types the answer" },
    { value: "paragraph", label: "Paragraph", icon: "📄", description: "Question with sub-questions" },
  ]

  const renderOptions = () => {
    if (type === "text_input") {
      const currentAnswers = Array.isArray(correct) ? correct : [""]

      return (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Correct Answer(s)</Label>
              {currentAnswers.length < 7 && (
                <Button type="button" onClick={addTextAnswer} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Answer
                </Button>
              )}
            </div>

            {currentAnswers.map((answer, i) => (
              <div key={i} className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">
                  {i + 1}
                </div>
                <Input
                  value={answer}
                  onChange={(e) => updateTextAnswer(i, e.target.value)}
                  placeholder={`Correct answer ${i + 1}`}
                  className="flex-1"
                  required={i === 0}
                />
                {currentAnswers.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeTextAnswer(i)}
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}

            <p className="text-sm text-muted-foreground">
              Add multiple acceptable answers. Each answer will be checked for exact matches. Use partial credit option
              for keyword matching and variations.
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch checked={caseSensitive} onCheckedChange={(checked) => setField("caseSensitive", checked)} />
              <Label className="text-sm">Case Sensitive</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={allowPartialCredit}
                onCheckedChange={(checked) => setField("allowPartialCredit", checked)}
              />
              <Label className="text-sm">Allow Partial Credit</Label>
            </div>
          </div>

          {allowPartialCredit && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Partial Credit:</strong> Answers will be scored based on keyword matching and similarity.
                Perfect matches get full points, partial matches get reduced points.
              </p>
            </div>
          )}
        </div>
      )
    }

    if (type === "paragraph") {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Sub-Questions ({subQuestions.length})</Label>
            <Button type="button" onClick={addSubQuestion} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Sub-Question
            </Button>
          </div>

          {subQuestions.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No sub-questions yet</h3>
              <p className="text-muted-foreground mb-4">
                Add sub-questions to create a comprehensive paragraph question
              </p>
              <Button onClick={addSubQuestion} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add First Sub-Question
              </Button>
            </div>
          ) : (
            subQuestions.map((subQ, i) => (
              <Card key={i} className="border-l-4 border-l-primary/50 bg-muted/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">
                        {i + 1}
                      </div>
                      <Label className="font-medium text-base">Sub-Question {i + 1}</Label>
                      <Badge variant="outline" className="text-xs">
                        {subQ.type === "mcq"
                          ? "Single Choice"
                          : subQ.type === "checkbox"
                            ? "Multiple Choice"
                            : "True/False"}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      onClick={() => removeSubQuestion(i)}
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <Textarea
                      value={subQ.text}
                      onChange={(e) => updateSubQuestion(i, "text", e.target.value)}
                      placeholder="Enter sub-question text"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <div className="flex gap-2">
                      {["mcq", "checkbox", "true_false"].map((t) => (
                        <label
                          key={t}
                          className={`
                            flex items-center p-2 rounded-lg border cursor-pointer transition-all text-sm
                            ${subQ.type === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                          `}
                        >
                          <input
                            type="radio"
                            name={`subtype-${index}-${i}`}
                            value={t}
                            checked={subQ.type === t}
                            onChange={() => {
                              const newSubQuestions = [...subQuestions]
                              newSubQuestions[i].type = t
                              if (t === "true_false") {
                                newSubQuestions[i].options = [
                                  { text: "True", image: null },
                                  { text: "False", image: null },
                                ]
                                newSubQuestions[i].correct = "0"
                              } else if (t === "mcq") {
                                if (!newSubQuestions[i].options || newSubQuestions[i].options.length < 2) {
                                  newSubQuestions[i].options = [
                                    { text: "", image: null },
                                    { text: "", image: null },
                                  ]
                                }
                                newSubQuestions[i].correct = "0"
                              } else if (t === "checkbox") {
                                if (!newSubQuestions[i].options || newSubQuestions[i].options.length < 2) {
                                  newSubQuestions[i].options = [
                                    { text: "", image: null },
                                    { text: "", image: null },
                                  ]
                                }
                                newSubQuestions[i].correct = []
                              }
                              setField("subQuestions", newSubQuestions)
                            }}
                            className="sr-only"
                          />
                          <span className="font-medium">
                            {t === "mcq" ? "Single" : t === "checkbox" ? "Multiple" : "True/False"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Answer Options</Label>
                      {subQ.type !== "true_false" && (
                        <Button type="button" onClick={() => addSubQuestionOption(i)} size="sm" variant="outline">
                          <Plus className="w-3 h-3 mr-1" />
                          Add Option
                        </Button>
                      )}
                    </div>

                    {subQ.type === "true_false" ? (
                      <div className="grid grid-cols-2 gap-2">
                        {["True", "False"].map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center space-x-2 p-2 bg-background rounded border">
                            <input
                              type="radio"
                              name={`sub-${index}-${i}`}
                              checked={String(subQ.correct) === String(optIdx)}
                              onChange={() => toggleSubQuestionCheckbox(i, optIdx)}
                              className="w-4 h-4"
                            />
                            <span className="font-medium">{opt}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {subQ.options &&
                          subQ.options.map((opt, optIdx) => {
                            const optionData = typeof opt === "string" ? { text: opt, image: null } : opt
                            return (
                              <div
                                key={optIdx}
                                className="flex items-center space-x-2 p-2 bg-background rounded border"
                              >
                                <input
                                  type={subQ.type === "checkbox" ? "checkbox" : "radio"}
                                  name={`sub-${index}-${i}`}
                                  checked={
                                    subQ.type === "checkbox"
                                      ? Array.isArray(subQ.correct) && subQ.correct.includes(String(optIdx))
                                      : String(subQ.correct) === String(optIdx)
                                  }
                                  onChange={() => toggleSubQuestionCheckbox(i, optIdx)}
                                  className="w-4 h-4"
                                />
                                <Input
                                  value={optionData.text}
                                  onChange={(e) => updateSubQuestionOption(i, optIdx, "text", e.target.value)}
                                  placeholder={`Option ${optIdx + 1}`}
                                  className="flex-1"
                                />
                                {subQ.options.length > 2 && (
                                  <Button
                                    type="button"
                                    onClick={() => removeSubQuestionOption(i, optIdx)}
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Label className="text-sm">Points:</Label>
                    <Input
                      type="number"
                      value={subQ.points}
                      onChange={(e) => updateSubQuestion(i, "points", Number.parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-20"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )
    }

    // Regular options for MCQ, checkbox, true_false
    if (type === "mcq" || type === "checkbox" || type === "true_false") {
      return (
        <div className="space-y-3">
          {options.map((opt, i) => {
            const optionData = typeof opt === "string" ? { text: opt, image: null } : opt

            return (
              <div key={i} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-shrink-0 mt-2">
                  <input
                    type={type === "checkbox" ? "checkbox" : "radio"}
                    name={`correct-${index}`}
                    checked={
                      type === "checkbox"
                        ? Array.isArray(correct) && correct.includes(String(i))
                        : String(correct) === String(i)
                    }
                    onChange={() => {
                      if (type === "checkbox") toggleCheckbox(i)
                      else setField("correct", String(i))
                    }}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  {type === "true_false" ? (
                    <span className="font-medium">{optionData.text}</span>
                  ) : (
                    <Input
                      value={optionData.text}
                      onChange={(e) => updateOption(i, "text", e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      required
                    />
                  )}

                  {/* Option Image - Not for true/false */}
                  {type !== "true_false" && (
                    <>
                      {optionData.image && (
                        <div className="relative inline-block">
                          <img
                            src={optionData.image || "/placeholder.svg"}
                            alt={`Option ${i + 1}`}
                            className="max-w-32 max-h-32 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            onClick={() => updateOption(i, "image", null)}
                            size="sm"
                            variant="ghost"
                            className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full text-destructive hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      {!optionData.image && (
                        <Button
                          type="button"
                          onClick={() => {
                            const input = document.createElement("input")
                            input.type = "file"
                            input.accept = "image/*"
                            input.onchange = (e) => handleImageUpload(e.target.files[0], "option", i)
                            input.click()
                          }}
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Add Image
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {(type === "mcq" || type === "checkbox") && options.length > 2 && (
                  <Button
                    type="button"
                    onClick={() => removeOption(i)}
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive mt-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )
    }

    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-semibold">
              {index + 1}
            </div>
            <h3 className="text-lg font-semibold">Question {index + 1}</h3>
            {type === "paragraph" && <Badge variant="secondary">Paragraph Question</Badge>}
            {isScheduled && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Scheduled
              </Badge>
            )}
          </div>
          <Button variant="destructive" size="sm" onClick={onRemove}>
            <Trash2 className="w-4 h-4 mr-1" />
            Remove
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Question Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={`question-${index}`}>Question Text *</Label>
            <div className="flex items-center space-x-2">
              <Switch checked={useRichText} onCheckedChange={setUseRichText} />
              <Label className="text-sm">Rich Text</Label>
            </div>
          </div>

          {useRichText ? (
            <TiptapEditor
              content={text}
              onChange={(content) => setField("text", content)}
              placeholder="Enter your question here..."
            />
          ) : (
            <Textarea
              id={`question-${index}`}
              placeholder="Enter your question here..."
              value={text}
              onChange={(e) => setField("text", e.target.value)}
              required
              rows={type === "paragraph" ? 5 : 3}
            />
          )}
        </div>

        {/* Media Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Question Images */}
          <div className="space-y-2">
            <Label>Question Images (Optional)</Label>

            {/* Display existing images */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {images.map((image, imgIndex) => (
                  <div key={imgIndex} className="relative inline-block">
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`Question image ${imgIndex + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      onClick={() => removeQuestionImage(imgIndex)}
                      size="sm"
                      variant="ghost"
                      className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full text-destructive hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new image button */}
            <Button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              variant="outline"
              className="w-full h-24 border-dashed"
            >
              <div className="text-center">
                <ImageIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <span className="text-sm">{images.length > 0 ? "Add Another Image" : "Upload Image"}</span>
              </div>
            </Button>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e.target.files[0], "question")}
              className="hidden"
            />
          </div>

          {/* Question Audio */}
          <div className="space-y-2">
            <Label>Question Audio (Optional)</Label>
            {audio ? (
              <div className="space-y-2">
                <audio controls className="w-full">
                  <source src={audio} />
                  Your browser does not support the audio element.
                </audio>
                <Button
                  type="button"
                  onClick={() => setField("audio", null)}
                  size="sm"
                  variant="destructive"
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove Audio
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                variant="outline"
                className="w-full h-24 border-dashed"
              >
                <div className="text-center">
                  <Volume2 className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <span className="text-sm">Upload Audio</span>
                </div>
              </Button>
            )}
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => handleAudioUpload(e.target.files[0])}
              className="hidden"
            />
          </div>
        </div>

        {/* Question Type */}
        <div className="space-y-3">
          <Label>Question Type</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {questionTypes.map((t) => (
              <label
                key={t.value}
                className={`
                  relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${type === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                `}
              >
                <input
                  type="radio"
                  name={`type-${index}`}
                  value={t.value}
                  checked={type === t.value}
                  onChange={() => handleTypeChange(t.value)}
                  className="sr-only"
                />
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <span className="font-medium block">{t.label}</span>
                    <span className="text-xs text-muted-foreground">{t.description}</span>
                  </div>
                </div>
                {type === t.value && (
                  <div className="absolute top-2 right-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Scheduling Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule Question (Optional)
            </Label>
            <Button type="button" onClick={() => setShowScheduling(!showScheduling)} size="sm" variant="ghost">
              {showScheduling ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showScheduling ? "Hide" : "Show"}
            </Button>
          </div>

          {showScheduling && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch checked={isScheduled} onCheckedChange={(checked) => setField("isScheduled", checked)} />
                  <Label className="text-sm">Enable scheduling for this question</Label>
                </div>

                {isScheduled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Available From</Label>
                      <Input
                        type="datetime-local"
                        value={scheduledStart}
                        onChange={(e) => setField("scheduledStart", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Available Until</Label>
                      <Input
                        type="datetime-local"
                        value={scheduledEnd}
                        onChange={(e) => setField("scheduledEnd", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Options/Answers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>
              {type === "text_input" ? "Correct Answer(s)" : type === "paragraph" ? "Sub-Questions" : "Answer Options"}
            </Label>
            {(type === "mcq" || type === "checkbox") && (
              <Button type="button" onClick={addOption} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Option
              </Button>
            )}
          </div>

          {renderOptions()}
        </div>

        {/* Answer Explanation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Answer Explanation (Optional)
            </Label>
            <Button type="button" onClick={() => setShowExplanation(!showExplanation)} size="sm" variant="ghost">
              {showExplanation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showExplanation ? "Hide" : "Show"}
            </Button>
          </div>

          {showExplanation && (
            <TiptapEditor
              content={explanation}
              onChange={(content) => setField("explanation", content)}
              placeholder="Explain why this is the correct answer..."
            />
          )}
        </div>

        <Separator />

        {/* Question Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`points-${index}`}>Points</Label>
            <Input
              id={`points-${index}`}
              type="number"
              value={points}
              onChange={(e) => setField("points", Number.parseInt(e.target.value) || 1)}
              min={1}
              max={100}
            />
          </div>

          {type === "checkbox" && (
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                checked={allowPartialCredit}
                onCheckedChange={(checked) => setField("allowPartialCredit", checked)}
              />
              <Label className="text-sm">Allow Partial Credit</Label>
            </div>
          )}

          {type === "text_input" && (
            <div className="flex items-center space-x-2 pt-6">
              <Switch checked={caseSensitive} onCheckedChange={(checked) => setField("caseSensitive", checked)} />
              <Label className="text-sm">Case Sensitive</Label>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
