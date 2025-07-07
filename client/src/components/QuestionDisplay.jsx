"use client"
import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Volume2, Play, Pause, HelpCircle } from "lucide-react"

export default function QuestionDisplay({
  question,
  questionIndex,
  answer,
  onAnswerChange,
  showExplanation = false,
  isReviewMode = false,
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)

  const { text, type, options = [], images = [], audio, explanation, subQuestions = [], points = 1 } = question

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener("ended", () => setIsPlaying(false))
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener("ended", () => setIsPlaying(false))
        }
      }
    }
  }, [audio])

  const handleAudioToggle = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        audioRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  const handleSingleChoice = (optionIndex) => {
    if (!isReviewMode) {
      onAnswerChange(questionIndex, String(optionIndex))
    }
  }

  const handleMultipleChoice = (optionIndex) => {
    if (!isReviewMode) {
      const currentAnswers = Array.isArray(answer) ? answer : []
      const optionStr = String(optionIndex)

      let newAnswers
      if (currentAnswers.includes(optionStr)) {
        newAnswers = currentAnswers.filter((a) => a !== optionStr)
      } else {
        newAnswers = [...currentAnswers, optionStr]
      }

      onAnswerChange(questionIndex, newAnswers)
    }
  }

  const handleTextInput = (value) => {
    if (!isReviewMode) {
      onAnswerChange(questionIndex, value)
    }
  }

  const handleSubQuestionAnswer = (subIndex, subAnswer) => {
    if (!isReviewMode) {
      const currentAnswers = answer || {}
      const newAnswers = { ...currentAnswers, [subIndex]: subAnswer }
      onAnswerChange(questionIndex, newAnswers)
    }
  }

  const renderQuestionText = () => {
    // Check if text contains HTML tags (rich text)
    const hasHtmlTags = /<[^>]*>/g.test(text)

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {hasHtmlTags ? (
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: text }} />
            ) : (
              <h3 className="text-lg font-medium leading-relaxed">{text}</h3>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Badge variant="outline" className="text-xs">
              {points} point{points !== 1 ? "s" : ""}
            </Badge>
            {type === "paragraph" && (
              <Badge variant="secondary" className="text-xs">
                Paragraph
              </Badge>
            )}
          </div>
        </div>

        {/* Question Images */}
        {images && images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative">
                <img
                  src={image || "/placeholder.svg"}
                  alt={`Question image ${index + 1}`}
                  className="w-full max-h-64 object-cover rounded-lg border"
                />
              </div>
            ))}
          </div>
        )}

        {/* Question Audio */}
        {audio && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Button
              type="button"
              onClick={handleAudioToggle}
              size="sm"
              variant="outline"
              className="flex-shrink-0 bg-transparent"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-2 flex-1">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{isPlaying ? "Playing..." : "Click to play audio"}</span>
            </div>
            <audio ref={audioRef} src={audio} preload="metadata" />
          </div>
        )}
      </div>
    )
  }

  const renderOptions = () => {
    switch (type) {
      case "mcq":
      case "true_false":
        return (
          <div className="space-y-3">
            {options.map((option, index) => {
              const optionData = typeof option === "string" ? { text: option, image: null } : option
              const isSelected = String(answer) === String(index)

              return (
                <div
                  key={index}
                  className={`
                    flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }
                    ${isReviewMode ? "cursor-default" : ""}
                  `}
                  onClick={() => handleSingleChoice(index)}
                >
                  <input
                    type="radio"
                    name={`question-${questionIndex}`}
                    value={index}
                    checked={isSelected}
                    onChange={() => handleSingleChoice(index)}
                    disabled={isReviewMode}
                    className="w-4 h-4 text-primary focus:ring-primary mt-1 pointer-events-none"
                  />
                  <div className="flex-1 space-y-2">
                    <span className="font-medium">{optionData.text}</span>
                    {optionData.image && (
                      <img
                        src={optionData.image || "/placeholder.svg"}
                        alt={`Option ${index + 1}`}
                        className="max-w-32 max-h-32 object-cover rounded border"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )

      case "checkbox":
        return (
          <div className="space-y-3">
            {options.map((option, index) => {
              const optionData = typeof option === "string" ? { text: option, image: null } : option
              const currentAnswers = Array.isArray(answer) ? answer : []
              const isSelected = currentAnswers.includes(String(index))

              return (
                <div
                  key={index}
                  className={`
                    flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }
                    ${isReviewMode ? "cursor-default" : ""}
                  `}
                  onClick={() => handleMultipleChoice(index)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleMultipleChoice(index)}
                    disabled={isReviewMode}
                    className="w-4 h-4 text-primary focus:ring-primary mt-1 pointer-events-none"
                  />
                  <div className="flex-1 space-y-2">
                    <span className="font-medium">{optionData.text}</span>
                    {optionData.image && (
                      <img
                        src={optionData.image || "/placeholder.svg"}
                        alt={`Option ${index + 1}`}
                        className="max-w-32 max-h-32 object-cover rounded border"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )

      case "text_input":
        return (
          <div className="space-y-2">
            <Label>Your Answer</Label>
            <Textarea
              value={answer || ""}
              onChange={(e) => handleTextInput(e.target.value)}
              placeholder="Type your answer here..."
              disabled={isReviewMode}
              className="text-base min-h-[100px]"
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Enter your answer in the text area above. Multiple acceptable answers may be allowed.
            </p>
          </div>
        )

      case "paragraph":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-primary" />
              <span className="font-medium text-primary">Answer all sub-questions below:</span>
            </div>

            {subQuestions && subQuestions.length > 0 ? (
              subQuestions.map((subQ, subIndex) => (
                <Card key={subIndex} className="border-l-4 border-l-primary/50 bg-muted/20">
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-1">
                          {subIndex + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium mb-3">{subQ.text}</h4>

                          {subQ.type === "mcq" || subQ.type === "true_false" ? (
                            <div className="space-y-2">
                              {subQ.options &&
                                subQ.options.map((opt, optIndex) => {
                                  const optData = typeof opt === "string" ? { text: opt, image: null } : opt
                                  const subAnswer = answer?.[subIndex]
                                  const isSelected = String(subAnswer) === String(optIndex)

                                  return (
                                    <div
                                      key={optIndex}
                                      className={`
                                      flex items-center gap-2 p-2 rounded border cursor-pointer transition-all
                                      ${
                                        isSelected
                                          ? "border-primary bg-primary/5"
                                          : "border-border hover:border-primary/50"
                                      }
                                      ${isReviewMode ? "cursor-default" : ""}
                                    `}
                                      onClick={() => handleSubQuestionAnswer(subIndex, String(optIndex))}
                                    >
                                      <input
                                        type="radio"
                                        name={`sub-${questionIndex}-${subIndex}`}
                                        checked={isSelected}
                                        onChange={() => handleSubQuestionAnswer(subIndex, String(optIndex))}
                                        disabled={isReviewMode}
                                        className="w-4 h-4 text-primary pointer-events-none"
                                      />
                                      <span>{optData.text}</span>
                                    </div>
                                  )
                                })}
                            </div>
                          ) : subQ.type === "checkbox" ? (
                            <div className="space-y-2">
                              {subQ.options &&
                                subQ.options.map((opt, optIndex) => {
                                  const optData = typeof opt === "string" ? { text: opt, image: null } : opt
                                  const subAnswer = answer?.[subIndex] || []
                                  const currentAnswers = Array.isArray(subAnswer) ? subAnswer : []
                                  const isSelected = currentAnswers.includes(String(optIndex))

                                  return (
                                    <div
                                      key={optIndex}
                                      className={`
                                      flex items-center gap-2 p-2 rounded border cursor-pointer transition-all
                                      ${
                                        isSelected
                                          ? "border-primary bg-primary/5"
                                          : "border-border hover:border-primary/50"
                                      }
                                      ${isReviewMode ? "cursor-default" : ""}
                                    `}
                                      onClick={() => {
                                        if (!isReviewMode) {
                                          const newAnswers = isSelected
                                            ? currentAnswers.filter((a) => a !== String(optIndex))
                                            : [...currentAnswers, String(optIndex)]
                                          handleSubQuestionAnswer(subIndex, newAnswers)
                                        }
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {
                                          if (!isReviewMode) {
                                            const newAnswers = isSelected
                                              ? currentAnswers.filter((a) => a !== String(optIndex))
                                              : [...currentAnswers, String(optIndex)]
                                            handleSubQuestionAnswer(subIndex, newAnswers)
                                          }
                                        }}
                                        disabled={isReviewMode}
                                        className="w-4 h-4 text-primary pointer-events-none"
                                      />
                                      <span>{optData.text}</span>
                                    </div>
                                  )
                                })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No sub-questions available for this paragraph question.</p>
              </div>
            )}
          </div>
        )

      default:
        return <div className="text-muted-foreground">Unsupported question type: {type}</div>
    }
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-6">
          {renderQuestionText()}
          {renderOptions()}

          {/* Show explanation if enabled and in review mode */}
          {showExplanation && explanation && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Explanation</h4>
                  <div
                    className="text-blue-800 dark:text-blue-200 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: explanation }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
