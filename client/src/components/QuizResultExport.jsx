"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Share2, ImageIcon, FileText } from "lucide-react"

export default function QuizResultExport({ result, onShare }) {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [isExportingCSV, setIsExportingCSV] = useState(false)

  const generateResultImage = async () => {
    setIsGeneratingImage(true)
    try {
      // Create a canvas element
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      // Set canvas size for better quality
      canvas.width = 1200
      canvas.height = 800

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      gradient.addColorStop(0, "#667eea")
      gradient.addColorStop(0.5, "#764ba2")
      gradient.addColorStop(1, "#667eea")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Add decorative elements
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvas.width
        const y = Math.random() * canvas.height
        const radius = Math.random() * 30 + 10
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Main content background with rounded corners
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)"
      ctx.shadowColor = "rgba(0, 0, 0, 0.2)"
      ctx.shadowBlur = 20
      ctx.shadowOffsetY = 10
      const padding = 60
      const contentWidth = canvas.width - padding * 2
      const contentHeight = canvas.height - padding * 2
      ctx.roundRect(padding, padding, contentWidth, contentHeight, 20)
      ctx.fill()
      ctx.shadowColor = "transparent"

      // Header section
      ctx.fillStyle = "#1f2937"
      ctx.font = "bold 48px Arial"
      ctx.textAlign = "center"
      ctx.fillText("🎯 Quiz Result", canvas.width / 2, 150)

      // Quiz title
      ctx.font = "32px Arial"
      ctx.fillStyle = "#374151"
      const maxTitleWidth = contentWidth - 100
      const titleText = result.quiz.title
      if (ctx.measureText(titleText).width > maxTitleWidth) {
        const words = titleText.split(" ")
        let line = ""
        let y = 200
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " "
          if (ctx.measureText(testLine).width > maxTitleWidth && n > 0) {
            ctx.fillText(line, canvas.width / 2, y)
            line = words[n] + " "
            y += 40
          } else {
            line = testLine
          }
        }
        ctx.fillText(line, canvas.width / 2, y)
      } else {
        ctx.fillText(titleText, canvas.width / 2, 200)
      }

      // Score section with enhanced design
      const centerX = canvas.width / 2
      const centerY = 400

      // Score background circle with gradient
      const scoreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 120)
      scoreGradient.addColorStop(0, "#f8fafc")
      scoreGradient.addColorStop(1, "#e2e8f0")
      ctx.fillStyle = scoreGradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, 120, 0, Math.PI * 2)
      ctx.fill()

      // Score progress circle
      const percentage = result.percentage
      const startAngle = -Math.PI / 2
      const endAngle = startAngle + (percentage / 100) * Math.PI * 2

      ctx.beginPath()
      ctx.arc(centerX, centerY, 100, 0, Math.PI * 2)
      ctx.lineWidth = 8
      ctx.strokeStyle = "#e5e7eb"
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(centerX, centerY, 100, startAngle, endAngle)
      ctx.lineWidth = 12
      ctx.lineCap = "round"
      ctx.strokeStyle = percentage >= 90 ? "#10b981" : percentage >= 70 ? "#f59e0b" : "#ef4444"
      ctx.stroke()

      // Score text with better formatting
      ctx.fillStyle = "#1f2937"
      ctx.font = "bold 48px Arial"
      ctx.textAlign = "center"
      ctx.fillText(`${result.score}/${result.totalPoints}`, centerX, centerY - 15)

      ctx.font = "28px Arial"
      ctx.fillStyle = percentage >= 90 ? "#10b981" : percentage >= 70 ? "#f59e0b" : "#ef4444"
      ctx.fillText(`${percentage}%`, centerX, centerY + 25)

      // Performance badge
      ctx.font = "20px Arial"
      ctx.fillStyle = "#6b7280"
      const performanceText = percentage >= 90 ? "🏆 Excellent!" : percentage >= 70 ? "⭐ Good Job!" : "💪 Keep Trying!"
      ctx.fillText(performanceText, centerX, centerY + 55)

      // Stats section
      const statsY = 580
      const statSpacing = contentWidth / 4

      // Time taken
      ctx.font = "18px Arial"
      ctx.fillStyle = "#374151"
      ctx.textAlign = "center"
      const minutes = Math.floor(result.timeTaken / 60)
      const seconds = result.timeTaken % 60
      ctx.fillText("⏱️ Time Taken", padding + statSpacing * 0.5, statsY)
      ctx.font = "24px Arial"
      ctx.fillStyle = "#1f2937"
      ctx.fillText(`${minutes}:${seconds.toString().padStart(2, "0")}`, padding + statSpacing * 0.5, statsY + 30)

      // Questions answered
      ctx.font = "18px Arial"
      ctx.fillStyle = "#374151"
      ctx.fillText("📝 Questions", padding + statSpacing * 1.5, statsY)
      ctx.font = "24px Arial"
      ctx.fillStyle = "#1f2937"
      ctx.fillText(`${result.answers.length}`, padding + statSpacing * 1.5, statsY + 30)

      // Correct answers
      const correctAnswers = result.answers.filter((a) => a.isCorrect).length
      ctx.font = "18px Arial"
      ctx.fillStyle = "#374151"
      ctx.fillText("✅ Correct", padding + statSpacing * 2.5, statsY)
      ctx.font = "24px Arial"
      ctx.fillStyle = "#10b981"
      ctx.fillText(`${correctAnswers}`, padding + statSpacing * 2.5, statsY + 30)

      // Accuracy
      const accuracy = result.answers.length > 0 ? Math.round((correctAnswers / result.answers.length) * 100) : 0
      ctx.font = "18px Arial"
      ctx.fillStyle = "#374151"
      ctx.fillText("🎯 Accuracy", padding + statSpacing * 3.5, statsY)
      ctx.font = "24px Arial"
      ctx.fillStyle = "#1f2937"
      ctx.fillText(`${accuracy}%`, padding + statSpacing * 3.5, statsY + 30)

      // Footer section
      ctx.font = "16px Arial"
      ctx.fillStyle = "#6b7280"
      ctx.textAlign = "center"
      ctx.fillText(`Completed by ${result.user.name}`, centerX, 680)
      ctx.fillText(`${new Date().toLocaleDateString()} • QuizMaster Pro`, centerX, 705)

      // Creator credit
      ctx.font = "14px Arial"
      ctx.fillText(`Quiz by ${result.quiz.creator.name}`, centerX, 730)

      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `quiz-result-${result.quiz.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
    } catch (error) {
      console.error("Error generating image:", error)
      alert("Failed to generate image. Please try again.")
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const exportToCSV = () => {
    setIsExportingCSV(true)
    try {
      const headers = [
        "Quiz Title",
        "User Name",
        "Score",
        "Total Points",
        "Percentage",
        "Time Taken (seconds)",
        "Completed At",
        "Question",
        "User Answer",
        "Correct Answer",
        "Is Correct",
        "Points Earned",
      ]

      const rows = []

      // Add summary row
      rows.push([
        result.quiz.title,
        result.user.name,
        result.score,
        result.totalPoints,
        result.percentage,
        result.timeTaken,
        new Date(result.completedAt || Date.now()).toLocaleString(),
        "SUMMARY",
        "",
        "",
        "",
        "",
      ])

      // Add answer details
      result.answers.forEach((answer, index) => {
        rows.push([
          result.quiz.title,
          result.user.name,
          result.score,
          result.totalPoints,
          result.percentage,
          result.timeTaken,
          new Date(result.completedAt || Date.now()).toLocaleString(),
          `Q${index + 1}: ${answer.questionText}`,
          answer.selectedText,
          answer.correctText,
          answer.isCorrect ? "Yes" : "No",
          answer.points || 0,
        ])
      })

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `quiz-result-${result.quiz.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting CSV:", error)
      alert("Failed to export CSV. Please try again.")
    } finally {
      setIsExportingCSV(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share & Export Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button onClick={onShare} variant="default">
            <Share2 className="h-4 w-4 mr-2" />
            Share Result
          </Button>

          <Button onClick={generateResultImage} variant="outline" disabled={isGeneratingImage}>
            <ImageIcon className="h-4 w-4 mr-2" />
            {isGeneratingImage ? "Generating..." : "Download Image"}
          </Button>

          <Button onClick={exportToCSV} variant="outline" disabled={isExportingCSV}>
            <FileText className="h-4 w-4 mr-2" />
            {isExportingCSV ? "Exporting..." : "Export CSV"}
          </Button>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Use the enhanced image export to share your detailed results on social media, or
            export to CSV for comprehensive analysis of your performance.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
