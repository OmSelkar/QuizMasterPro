import QuizAttempt from "../models/QuizAttempt.js"
import Quiz from "../models/Quiz.js"
import admin from "firebase-admin"
import mongoose from "mongoose"

/**
 * Helper: get current user id and display name
 */
function getCurrentUser(req) {
  // 1) Firebase-authenticated
  if (req.uid) {
    const name = req.firebaseUser?.name || req.firebaseUser?.displayName || req.firebaseUser?.email || "Anonymous"
    return { id: req.uid, name }
  }

  // 2) JWT-authenticated user
  if (req.user) {
    return {
      id: req.user._id.toString(),
      name: req.user.displayName || req.user.username || req.user.email,
    }
  }

  return null
}

/**
 * Helper: validate ObjectId
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * Helper: Calculate text similarity for partial matching with keyword support
 */
function calculateTextSimilarity(answer, correctAnswers, caseSensitive = false) {
  if (!answer || !correctAnswers || correctAnswers.length === 0) return 0

  const normalizeText = (text) => {
    let normalized = String(text).trim()
    if (!caseSensitive) {
      normalized = normalized.toLowerCase()
    }
    return normalized
  }

  const normalizedAnswer = normalizeText(answer)
  let bestScore = 0

  // Check against all possible correct answers
  for (const correctAnswer of correctAnswers) {
    const normalizedCorrect = normalizeText(correctAnswer)

    // Exact match gets full score
    if (normalizedAnswer === normalizedCorrect) {
      return 1
    }

    // Check if answer contains the correct answer (keyword matching)
    if (normalizedAnswer.includes(normalizedCorrect)) {
      bestScore = Math.max(bestScore, 0.9)
      continue
    }

    // Check if correct answer contains the user answer (partial matching)
    if (normalizedCorrect.includes(normalizedAnswer)) {
      bestScore = Math.max(bestScore, 0.8)
      continue
    }

    // Calculate Levenshtein distance for fuzzy matching
    const distance = levenshteinDistance(normalizedAnswer, normalizedCorrect)
    const maxLength = Math.max(normalizedAnswer.length, normalizedCorrect.length)

    if (maxLength === 0) continue

    const similarity = 1 - distance / maxLength
    if (similarity > 0.7) {
      bestScore = Math.max(bestScore, similarity * 0.8) // Reduce score for fuzzy matches
    }
  }

  return bestScore
}

/**
 * Helper: Calculate Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * Helper: Grade a single question
 */
function gradeQuestion(question, userAnswer, questionIndex) {
  console.log(`Grading question ${questionIndex + 1}:`, {
    type: question.type,
    userAnswer,
    correct: question.correct,
  })

  let score = 0
  let maxScore = question.points || 1
  let isCorrect = false
  let details = {}

  try {
    switch (question.type) {
      case "mcq":
      case "true_false":
        isCorrect = String(userAnswer) === String(question.correct)
        score = isCorrect ? maxScore : 0
        details = {
          selected: userAnswer,
          correct: question.correct,
          isCorrect,
        }
        break

      case "checkbox":
        const correctAnswers = Array.isArray(question.correct) ? question.correct.map(String) : []
        const selectedAnswers = Array.isArray(userAnswer) ? userAnswer.map(String) : []

        const correctCount = correctAnswers.filter((ans) => selectedAnswers.includes(ans)).length
        const incorrectCount = selectedAnswers.filter((ans) => !correctAnswers.includes(ans)).length

        if (question.allowPartialCredit) {
          // Partial credit: (correct selections - incorrect selections) / total correct
          const partialScore = Math.max(0, correctCount - incorrectCount) / correctAnswers.length
          score = Math.round(partialScore * maxScore)
        } else {
          // All or nothing
          isCorrect = correctCount === correctAnswers.length && incorrectCount === 0
          score = isCorrect ? maxScore : 0
        }

        details = {
          selected: selectedAnswers,
          correct: correctAnswers,
          correctCount,
          incorrectCount,
          isCorrect: correctCount === correctAnswers.length && incorrectCount === 0,
        }
        break

      case "text_input":
        const correctTexts = Array.isArray(question.correct) ? question.correct : [question.correct]
        const similarity = calculateTextSimilarity(userAnswer, correctTexts, question.caseSensitive)

        if (question.allowPartialCredit) {
          score = Math.round(similarity * maxScore)
        } else {
          score = similarity >= 0.8 ? maxScore : 0 // Lowered threshold for better matching
        }

        isCorrect = similarity >= 0.8
        details = {
          userAnswer,
          correctAnswers: correctTexts,
          similarity,
          isCorrect,
        }
        break

      case "paragraph":
        let totalSubScore = 0
        let totalSubMax = 0
        const subDetails = []

        if (question.subQuestions && Array.isArray(question.subQuestions)) {
          question.subQuestions.forEach((subQ, subIndex) => {
            const subAnswer = userAnswer && typeof userAnswer === "object" ? userAnswer[subIndex] : null
            const subResult = gradeQuestion(subQ, subAnswer, subIndex)

            totalSubScore += subResult.score
            totalSubMax += subResult.maxScore
            subDetails.push(subResult)
          })
        }

        score = totalSubScore
        maxScore = totalSubMax
        isCorrect = totalSubScore === totalSubMax
        details = {
          subQuestions: subDetails,
          totalSubScore,
          totalSubMax,
          isCorrect,
        }
        break

      default:
        console.warn(`Unknown question type: ${question.type}`)
        score = 0
        details = { error: "Unknown question type" }
    }
  } catch (error) {
    console.error(`Error grading question ${questionIndex + 1}:`, error)
    score = 0
    details = { error: error.message }
  }

  console.log(`Question ${questionIndex + 1} result:`, { score, maxScore, isCorrect })

  return {
    score,
    maxScore,
    isCorrect,
    details,
  }
}

/**
 * POST /api/quizzes/:id/attempt
 * Create a new quiz attempt
 */
export const createAttempt = async (req, res) => {
  try {
    const { id } = req.params

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID format",
      })
    }

    const me = getCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: "Not authenticated" })
    }

    const quiz = await Quiz.findById(id)
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    const { answers = {}, timeTaken = 0 } = req.body

    console.log("=== GRADING QUIZ ATTEMPT ===")
    console.log("Quiz:", quiz.title)
    console.log("User:", me.name)
    console.log("Answers received:", answers)

    let totalScore = 0
    let totalPossible = 0
    const gradingDetails = []

    // Grade each question
    quiz.questions.forEach((question, index) => {
      const userAnswer = answers[index]
      const result = gradeQuestion(question, userAnswer, index)

      totalScore += result.score
      totalPossible += result.maxScore
      gradingDetails.push({
        questionIndex: index,
        questionType: question.type,
        userAnswer,
        ...result,
      })
    })

    console.log("=== GRADING SUMMARY ===")
    console.log("Total Score:", totalScore)
    console.log("Total Possible:", totalPossible)
    console.log("Percentage:", Math.round((totalScore / totalPossible) * 100))

    // Get user info for attempt record
    let userName = me.name
    let userEmail = ""
    let userPhotoURL = ""

    if (req.uid) {
      try {
        const firebaseUser = await admin.auth().getUser(req.uid)
        userName = firebaseUser.displayName || firebaseUser.email || userName
        userEmail = firebaseUser.email || ""
        userPhotoURL = firebaseUser.photoURL || ""
      } catch (firebaseError) {
        console.log("Could not fetch Firebase user details:", firebaseError.message)
      }
    }

    // Build answers array with required questionText field
    const answersArray = Object.entries(answers).map(([questionIndex, answer]) => {
      const qIndex = Number.parseInt(questionIndex, 10)
      const question = quiz.questions[qIndex]

      return {
        questionIndex: qIndex,
        questionId: question._id,
        questionText: question.text || `Question ${qIndex + 1}`,
        selectedAnswer: answer,
        selectedText: typeof answer === "string" ? answer : JSON.stringify(answer),
        correctText: typeof question.correct === "string" ? question.correct : JSON.stringify(question.correct),
        isCorrect: gradingDetails[qIndex]?.isCorrect || false,
        points: gradingDetails[qIndex]?.score || 0,
        explanation: question.explanation || "",
        timeTaken: 0, // Individual question time not tracked yet
      }
    })

    // Save attempt with detailed grading
    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      userId: me.id,
      userSource: req.user ? "mongo" : "firebase",
      userName,
      userEmail,
      userPhotoURL,
      answers: answersArray,
      score: totalScore,
      maxPossibleScore: totalPossible,
      timeTaken,
      percentage: Math.round((totalScore / totalPossible) * 100),
    })

    // Update quiz attempt counter
    await Quiz.findByIdAndUpdate(id, { $inc: { attempts: 1 } })

    console.log("Attempt saved with ID:", attempt._id)

    return res.json({
      success: true,
      attemptId: attempt._id,
      score: totalScore,
      totalPoints: totalPossible,
      percentage: Math.round((totalScore / totalPossible) * 100),
    })
  } catch (err) {
    console.error("createAttempt error:", err)
    return res.status(500).json({
      success: false,
      message: "Server error creating attempt",
      error: err.message,
    })
  }
}

/**
 * GET /api/quizzes/:id/result/:attemptId
 * Get attempt result details
 */
export const getAttemptResult = async (req, res) => {
  try {
    const { id, attemptId } = req.params

    // Validate ObjectId formats
    if (!isValidObjectId(id) || !isValidObjectId(attemptId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      })
    }

    const me = getCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: "Not authenticated" })
    }

    const attempt = await QuizAttempt.findById(attemptId).lean()
    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" })
    }

    // Check if user owns this attempt or owns the quiz
    const quiz = await Quiz.findById(attempt.quizId).lean()
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    const canView = String(attempt.userId) === String(me.id) || String(quiz.creatorId) === String(me.id)
    if (!canView) {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    // Build detailed answer breakdown
    const answers = quiz.questions.map((q, idx) => {
      const attemptAnswer = attempt.answers.find((a) => a.questionIndex === idx)
      const given = attemptAnswer ? attemptAnswer.selectedAnswer : null
      let selectedText,
        correctText,
        isCorrect = false

      if (q.type === "true_false") {
        selectedText = given === "0" ? "True" : given === "1" ? "False" : "Not answered"
        correctText = String(q.correct) === "0" ? "True" : "False"
        isCorrect = String(given) === String(q.correct)
      } else if (q.type === "mcq") {
        const selectedIndex = Number(given)
        selectedText =
          q.options && q.options[selectedIndex]
            ? q.options[selectedIndex].text || q.options[selectedIndex]
            : "Not answered"
        const correctIndex = Number(q.correct)
        correctText =
          q.options && q.options[correctIndex]
            ? q.options[correctIndex].text || q.options[correctIndex]
            : "Not answered"
        isCorrect = String(given) === String(q.correct)
      } else if (q.type === "checkbox") {
        const selectedIndices = Array.isArray(given) ? given.map(String) : []
        selectedText =
          selectedIndices
            .map((i) => {
              const option = q.options && q.options[Number(i)]
              return option ? option.text || option : i
            })
            .join(", ") || "Not answered"

        const correctIndices = Array.isArray(q.correct) ? q.correct.map(String) : []
        correctText = correctIndices
          .map((i) => {
            const option = q.options && q.options[Number(i)]
            return option ? option.text || option : i
          })
          .join(", ")

        isCorrect =
          selectedIndices.length === correctIndices.length &&
          selectedIndices.sort().every((v, i) => v === correctIndices.sort()[i])
      } else if (q.type === "text_input") {
        selectedText = given || "Not answered"
        const correctAnswers = Array.isArray(q.correct) ? q.correct : [q.correct]
        correctText = correctAnswers.join(" OR ")
        isCorrect = attemptAnswer ? attemptAnswer.isCorrect : false
      } else if (q.type === "paragraph") {
        selectedText = "Paragraph question"
        correctText = "See sub-questions"
        isCorrect = attemptAnswer ? attemptAnswer.isCorrect : false
      } else {
        selectedText = given || "Not answered"
        correctText = q.correct || "No correct answer set"
        isCorrect = attemptAnswer ? attemptAnswer.isCorrect : false
      }

      return {
        questionText: q.text,
        selectedText,
        correctText,
        isCorrect,
        points: q.points || 0,
        earnedPoints: isCorrect ? q.points || 0 : 0,
      }
    })

    return res.json({
      success: true,
      attempt: {
        _id: attempt._id,
        user: {
          name: attempt.userName || "Anonymous",
          email: attempt.userEmail || "",
          photoURL: attempt.userPhotoURL || "",
        },
        quiz: {
          _id: quiz._id,
          title: quiz.title,
          creator: { name: quiz.creatorName },
          timeLimit: quiz.timeLimit || 0,
        },
        score: attempt.score,
        totalPoints: attempt.maxPossibleScore,
        percentage: Math.round((attempt.score / attempt.maxPossibleScore) * 100),
        timeTaken: attempt.timeTaken,
        completedAt: attempt.completedAt,
        answers,
      },
    })
  } catch (err) {
    console.error("getAttemptResult error:", err)
    return res.status(500).json({
      success: false,
      message: "Server error fetching result",
      error: err.message,
    })
  }
}

/**
 * GET /api/quizzes/:id/attempts
 * Get all attempts for a quiz (quiz owners only)
 */
export const getQuizAttempts = async (req, res) => {
  try {
    const { id } = req.params

    console.log("=== GET QUIZ ATTEMPTS ===")
    console.log("Quiz ID:", id)

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID format",
      })
    }

    const me = getCurrentUser(req)
    console.log("Current user:", me)

    if (!me) {
      return res.status(401).json({ success: false, message: "Not authenticated" })
    }

    const quiz = await Quiz.findById(id).lean()
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    console.log("Quiz found:", { title: quiz.title, creatorId: quiz.creatorId })
    console.log("User ID:", me.id)

    // Check if user is the quiz creator - FIXED: String comparison
    if (String(quiz.creatorId) !== String(me.id)) {
      console.log("Access denied - user is not quiz creator")
      return res.status(403).json({
        success: false,
        message: "Access denied. Only quiz creators can view attempts.",
      })
    }

    // Get all attempts for this quiz
    const attempts = await QuizAttempt.find({ quizId: id }).sort({ completedAt: -1 }).lean()
    console.log("Found attempts:", attempts.length)

    // Enhance attempts with user display names
    const enhancedAttempts = await Promise.all(
      attempts.map(async (attempt) => {
        let displayName = attempt.userName || "Anonymous"
        let email = attempt.userEmail || ""
        let photoURL = attempt.userPhotoURL || ""

        // Try to get updated user info from Firebase if available
        if (attempt.userId && req.uid) {
          try {
            const userRecord = await admin.auth().getUser(attempt.userId)
            displayName = userRecord.displayName || userRecord.email || displayName
            email = userRecord.email || email
            photoURL = userRecord.photoURL || photoURL
          } catch (firebaseError) {
            console.log(`Could not fetch Firebase user ${attempt.userId}:`, firebaseError.message)
          }
        }

        return {
          ...attempt,
          userName: displayName,
          userEmail: email,
          userPhotoURL: photoURL,
          percentage: Math.round(((attempt.score || 0) / (attempt.maxPossibleScore || 1)) * 100),
        }
      }),
    )

    console.log("Returning enhanced attempts:", enhancedAttempts.length)

    return res.json({
      success: true,
      attempts: enhancedAttempts,
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        creatorName: quiz.creatorName,
      },
    })
  } catch (err) {
    console.error("getQuizAttempts error:", err)
    return res.status(500).json({
      success: false,
      message: "Server error fetching attempts",
      error: err.message,
    })
  }
}

/**
 * GET /api/quizzes/:id/result/:attemptId/export
 * Export attempt result as PDF/CSV
 */
export const exportAttemptResult = async (req, res) => {
  try {
    const { id, attemptId } = req.params
    const { format = "json" } = req.query

    // Validate ObjectId formats
    if (!isValidObjectId(id) || !isValidObjectId(attemptId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      })
    }

    const me = getCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: "Not authenticated" })
    }

    const attempt = await QuizAttempt.findById(attemptId).lean()
    if (!attempt) {
      return res.status(404).json({ success: false, message: "Attempt not found" })
    }

    // Check permissions
    const quiz = await Quiz.findById(attempt.quizId).lean()
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    const canExport = String(attempt.userId) === String(me.id) || String(quiz.creatorId) === String(me.id)
    if (!canExport) {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    // For now, just return JSON format
    const exportData = {
      quiz: {
        title: quiz.title,
        creator: quiz.creatorName,
        totalQuestions: quiz.questions.length,
      },
      attempt: {
        user: attempt.userName || "Anonymous",
        score: attempt.score,
        totalPoints: attempt.maxPossibleScore,
        percentage: Math.round(((attempt.score || 0) / (attempt.maxPossibleScore || 1)) * 100),
        timeTaken: attempt.timeTaken,
        completedAt: attempt.completedAt,
      },
      answers: attempt.answers,
    }

    if (format === "csv") {
      // Simple CSV export
      const csvHeaders = ["Question", "Answer", "Correct", "Points"]
      const csvRows = attempt.answers.map((answer, idx) => [
        `Question ${idx + 1}`,
        answer.selectedAnswer || "Not answered",
        answer.isCorrect ? "Yes" : "No",
        answer.points || 0,
      ])

      const csvContent = [csvHeaders, ...csvRows].map((row) => row.join(",")).join("\n")

      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", `attachment; filename="quiz-result-${attemptId}.csv"`)
      return res.send(csvContent)
    }

    return res.json({
      success: true,
      data: exportData,
    })
  } catch (err) {
    console.error("exportAttemptResult error:", err)
    return res.status(500).json({
      success: false,
      message: "Server error exporting result",
      error: err.message,
    })
  }
}

export default {
  createAttempt,
  getAttemptResult,
  getQuizAttempts,
  exportAttemptResult,
}
