"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Circle, AlertCircle, Clock } from "lucide-react"

export function ImprovedQuestionPanel({
  questions,
  currentQuestionIndex,
  answers,
  onQuestionSelect,
  timeRemaining,
  totalTime,
}) {
  const getQuestionStatus = (index) => {
    const hasAnswer = answers[index] !== undefined && answers[index] !== null && answers[index] !== ""
    const isCurrent = index === currentQuestionIndex

    if (isCurrent) return "current"
    if (hasAnswer) return "answered"
    return "unanswered"
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "answered":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "current":
        return <AlertCircle className="h-4 w-4 text-blue-600" />
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "answered":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      case "current":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
      default:
        return "bg-muted text-muted-foreground border-muted"
    }
  }

  const answeredCount = Object.keys(answers).length
  const progressPercentage = (answeredCount / questions.length) * 100

  return (
    <Card className="sticky top-4">
      <CardContent className="p-4 space-y-4">
        {/* Timer */}
        {totalTime > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Time Remaining</span>
              </div>
              <Badge variant={timeRemaining < 300 ? "destructive" : "outline"}>
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, "0")}
              </Badge>
            </div>
            <Progress value={(timeRemaining / totalTime) * 100} className="h-2" />
          </div>
        )}

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress</span>
            <Badge variant="outline">
              {answeredCount}/{questions.length}
            </Badge>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Question Grid */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Questions</h4>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, index) => {
              const status = getQuestionStatus(index)
              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className={`h-10 w-full p-0 ${getStatusColor(status)} hover:scale-105 transition-all`}
                  onClick={() => onQuestionSelect(index)}
                >
                  <div className="flex flex-col items-center gap-1">
                    {getStatusIcon(status)}
                    <span className="text-xs font-medium">{index + 1}</span>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-2 pt-2 border-t">
          <h5 className="text-xs font-medium text-muted-foreground">Legend</h5>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-blue-600" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3 text-muted-foreground" />
              <span>Not answered</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
