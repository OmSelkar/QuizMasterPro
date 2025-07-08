// server/controllers/quizController.js

import Quiz from "../models/Quiz.js"
import QuizAttempt from "../models/QuizAttempt.js"
import admin from "firebase-admin"
import mongoose from "mongoose"
import User from "../models/User.js"
import { privacyFilter, filterLeaderboardData } from "../middlewares/privacy-filter.js"

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
 * Helper: Update user's last seen timestamp
 */
async function updateUserLastSeen(userId) {
  try {
    await User.findOneAndUpdate(
      { firebaseUid: userId },
      {
        lastSeen: new Date(),
        isOnline: true,
      },
      { upsert: true, new: true },
    )
    console.log(`✅ Updated last seen for user: ${userId}`)
  } catch (error) {
    console.error("❌ Error updating user last seen:", error)
  }
}

/**
 * Helper: validate ObjectId
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * GET /api/quizzes
 */
export const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 })
    return res.json({ success: true, quizzes })
  } catch (err) {
    console.error("getAllQuizzes:", err)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * GET /api/quizzes/:id
 */
export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID format",
      })
    }

    const quiz = await Quiz.findById(id)
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }
    return res.json({ success: true, quiz })
  } catch (err) {
    console.error("getQuizById:", err)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * GET /api/quizzes/:id/detail
 * Public quiz metadata (no questions)
 */
export const getQuizDetail = async (req, res) => {
  try {
    const { id } = req.params

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID format",
      })
    }

    const quiz = await Quiz.findById(id).lean()
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    return res.json({
      success: true,
      detail: {
        title: quiz.title,
        description: quiz.description,
        category: quiz.category,
        creatorName: quiz.creatorName,
        creatorId: quiz.creatorId,
        createdAt: quiz.createdAt,
        questionsCount: quiz.questions.length,
        totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
        timeLimit: quiz.timeLimit,
        attempts: quiz.attempts || 0,
      },
    })
  } catch (err) {
    console.error("getQuizDetail:", err)
    return res.status(500).json({ success: false, message: err.message })
  }
}

/**
 * GET /api/quizzes/:id/leaderboard (PUBLIC VERSION - Remove this if not needed)
 */
export const getLeaderboard = async (req, res) => {
  try {
    const { id } = req.params

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quiz ID format",
      })
    }

    const quiz = await Quiz.findById(id).lean()
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    const attempts = await QuizAttempt.find({ quizId: id })
      .sort({ score: -1, timeTaken: 1 })
      .limit(50)
      .select("userId userName score timeTaken createdAt")
      .lean()

    console.log("Public leaderboard - Raw attempts:", attempts)

    // Build leaderboard data
    const leaderboard = attempts.map((a, idx) => ({
      rank: idx + 1,
      userId: a.userId || "unknown",
      user: a.userName || "Anonymous",
      score: a.score || 0,
      timeTaken: a.timeTaken || 0,
      isCurrentUser: false, // Can't determine without auth
      createdAt: a.createdAt,
    }))

    // Calculate statistics
    const totalAttempts = attempts.length
    const maxPossibleScore = quiz.questions ? quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0) : 0
    const averageScore =
      totalAttempts > 0 ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / totalAttempts) : 0

    const response = {
      success: true,
      quiz: {
        _id: quiz._id,
        title: quiz.title || "Untitled Quiz",
        description: quiz.description || "",
        maxPossibleScore,
      },
      leaderboard,
      statistics: {
        totalAttempts,
        averageScore,
        maxPossibleScore,
      },
    }

    console.log("Public leaderboard response:", response)
    return res.json(response)
  } catch (err) {
    console.error("getLeaderboard:", err)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * GET /api/quizzes/:id/attempts
 * List all attempts for THIS quiz (owners only) - FIXED VERSION
 */
export const listAttemptsForQuiz = async (req, res) => {
  try {
    const { id } = req.params

    console.log("=== LIST ATTEMPTS FOR QUIZ ===")
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

    // Check ownership - FIXED: Ensure both are strings for comparison
    if (String(quiz.creatorId) !== String(me.id)) {
      console.log("Access denied - not quiz creator")
      return res.status(403).json({
        success: false,
        message: "Access denied. Only quiz creators can view attempts.",
      })
    }

    const attempts = await QuizAttempt.find({ quizId: quiz._id }).sort({ createdAt: -1 }).lean()
    console.log("Found attempts:", attempts.length)

    // Enhance attempts with proper user data
    const enhancedAttempts = await Promise.all(
      attempts.map(async (attempt) => {
        let displayName = attempt.userName || "Anonymous"
        let email = attempt.userEmail || ""
        let photoURL = attempt.userPhotoURL || ""

        // Try to get updated Firebase user info
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
          percentage: Math.round(((attempt.score || 0) / (attempt.totalPoints || 1)) * 100),
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
    console.error("listAttemptsForQuiz error:", err)
    return res.status(500).json({
      success: false,
      message: "Server error fetching attempts",
      error: err.message,
    })
  }
}

/**
 * POST /api/quizzes
 * Create a new quiz
 */
export const createQuiz = async (req, res) => {
  try {
    const me = getCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: "Not authenticated" })
    }

    const { title, description, category, timeLimit, questions } = req.body
    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Title and at least one question are required",
      })
    }

    const newQuiz = await Quiz.create({
      title,
      description,
      category,
      timeLimit: Number.parseInt(timeLimit, 10) || 0,
      questions,
      creatorId: me.id, // from getCurrentUser
      creatorName: me.name, // from getCurrentUser
    })

    return res.status(201).json({ success: true, quiz: newQuiz })
  } catch (err) {
    console.error("createQuiz error:", err)
    return res.status(500).json({ success: false, message: "Server error", error: err.message })
  }
}

/**
 * PUT /api/quizzes/:id
 * Update existing quiz (owners only)
 */
export const updateQuiz = async (req, res) => {
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

    // Ownership check
    if (String(quiz.creatorId) !== String(me.id)) {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    const { title, description, category, timeLimit, questions } = req.body
    quiz.title = title
    quiz.description = description
    quiz.category = category
    quiz.timeLimit = Number.parseInt(timeLimit, 10) || 0
    quiz.questions = questions

    await quiz.save()
    return res.json({ success: true, quiz })
  } catch (err) {
    console.error("updateQuiz:", err)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * DELETE /api/quizzes/:id
 * Delete quiz + its attempts (owners only)
 */
export const deleteQuiz = async (req, res) => {
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

    if (String(quiz.creatorId) !== String(me.id)) {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    // remove attempts then quiz
    await QuizAttempt.deleteMany({ quizId: quiz._id })
    await quiz.deleteOne()

    return res.json({ success: true, message: "Quiz deleted" })
  } catch (err) {
    console.error("deleteQuiz:", err)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * POST /api/quizzes/:id/attempt
 * Submit a new attempt
 */
export const submitAttempt = async (req, res) => {
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

    // Grade
    let score = 0
    quiz.questions.forEach((q, idx) => {
      const given = answers[idx]
      if (q.type === "mcq" || q.type === "true_false") {
        if (`${given}` === `${q.correct}`) score += q.points
      } else if (q.type === "checkbox") {
        const corr = q.correct.map(String).sort()
        const sel = Array.isArray(given) ? given.map(String).sort() : []
        if (corr.length === sel.length && corr.every((v, i) => v === sel[i])) {
          score += q.points
        }
      }
    })

    // Save attempt
    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      userId: me.id,
      userSource: req.user ? "mongo" : "firebase",
      userName: me.name,
      answers: Object.entries(answers).map(([questionIndex, answer]) => ({
        questionIndex: Number.parseInt(questionIndex, 10),
        answer,
      })),
      score,
      timeTaken,
    })

    // increment counter
    await Quiz.findByIdAndUpdate(id, { $inc: { attempts: 1 } })

    return res.json({ success: true, attemptId: attempt._id })
  } catch (err) {
    console.error("submitAttempt:", err)
    return res.status(500).json({ success: false, message: "Server error submitting attempt" })
  }
}

/**
 * GET /api/quizzes/:id/result/:attemptId
 * View one own attempt result
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

    // Only owner of attempt
    if (String(attempt.userId) !== String(me.id)) {
      return res.status(403).json({ success: false, message: "Access denied" })
    }

    // Fetch quiz for metadata & questions
    const quiz = await Quiz.findById(attempt.quizId).select("title creatorName timeLimit questions").lean()
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    // Build answer breakdown
    const answers = quiz.questions.map((q, idx) => {
      const userAns = attempt.answers.find((a) => a.questionIndex === idx)
      const given = userAns ? userAns.answer : null
      let selectedText,
        correctText,
        isCorrect = false

      if (q.type === "true_false") {
        selectedText = given === "true" ? "True" : given === "false" ? "False" : "Not answered"
        correctText = String(q.correct).toLowerCase() === "true" ? "True" : "False"
        isCorrect = String(given) === String(q.correct)
      } else if (q.type === "mcq") {
        const idxSel = Number(given)
        selectedText = q.options[idxSel] ?? "Not answered"
        const idxCorr = Number(q.correct)
        correctText = q.options[idxCorr] ?? "Not answered"
        isCorrect = String(given) === String(q.correct)
      } else {
        // checkbox
        const selArr = Array.isArray(given) ? given.map(String) : []
        selectedText = selArr.map((i) => q.options[Number(i)]).join(", ") || "Not answered"
        const corrArr = Array.isArray(q.correct) ? q.correct.map(String) : []
        correctText = corrArr.map((i) => q.options[Number(i)]).join(", ")
        isCorrect = selArr.length === corrArr.length && selArr.sort().every((v, i) => v === corrArr.sort()[i])
      }

      return {
        questionText: q.text,
        selectedText,
        correctText,
        isCorrect,
        points: q.points,
      }
    })

    return res.json({
      success: true,
      attempt: {
        user: { name: me.name },
        quiz: {
          _id: quiz._id,
          title: quiz.title,
          creator: { name: quiz.creatorName },
          timeLimit: quiz.timeLimit || 0,
        },
        score: attempt.score,
        totalPoints: quiz.questions.reduce((sum, q) => sum + q.points, 0),
        timeTaken: attempt.timeTaken,
        answers,
      },
    })
  } catch (err) {
    console.error("getAttemptResult:", err)
    return res.status(500).json({ success: false, message: "Server error fetching result" })
  }
}

/**
 * GET /api/quizzes/my-created
 * Returns quizzes where creatorId == current user
 */
export async function getMyQuizzes(req, res) {
  try {
    const me = getCurrentUser(req)
    if (!me) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      })
    }

    const quizzes = await Quiz.find({ creatorId: me.id }).sort({ createdAt: -1 }).lean()

    return res.json({ success: true, quizzes })
  } catch (err) {
    console.error("getMyQuizzes:", err)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * GET /api/quizzes/my-attempts
 * Returns attempts by the current user with quiz details
 */
export async function listMyAttempts(req, res) {
  try {
    const me = getCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: "Not authenticated" })
    }

    const attempts = await QuizAttempt.find({ userId: me.id }).sort({ createdAt: -1 }).lean()

    const results = await Promise.all(
      attempts.map(async (a) => {
        try {
          const quiz = await Quiz.findById(a.quizId).lean()
          if (!quiz) return null

          return {
            _id: a._id,
            quizId: a.quizId,
            quiz: {
              title: quiz.title,
              description: quiz.description,
              category: quiz.category,
              creatorName: quiz.creatorName,
            },
            score: a.score,
            totalPoints: quiz.questions.reduce((s, q) => s + q.points, 0),
            timeTaken: a.timeTaken,
            createdAt: a.createdAt,
          }
        } catch (err) {
          console.error("Error fetching quiz for attempt:", err)
          return null
        }
      }),
    )

    // Filter out null results
    const validResults = results.filter((r) => r !== null)

    return res.json({ success: true, attempts: validResults })
  } catch (err) {
    console.error("listMyAttempts:", err)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * GET /api/quizzes/my-performance
 * Returns performance data for quizzes the user created
 */
export async function getMyPerformance(req, res) {
  try {
    const me = getCurrentUser(req)
    if (!me) {
      return res.status(401).json({ success: false, message: "Not authenticated" })
    }

    const quizzes = await Quiz.find({ creatorId: me.id }).lean()

    const performance = await Promise.all(
      quizzes.map(async (q) => {
        try {
          const attempts = await QuizAttempt.find({ quizId: q._id }).lean()
          return {
            quiz: { _id: q._id, title: q.title },
            attempts: attempts.map((a) => ({
              userName: a.userName,
              score: a.score,
              timeTaken: a.timeTaken,
              createdAt: a.createdAt,
            })),
          }
        } catch (err) {
          console.error("Error fetching attempts for quiz:", err)
          return {
            quiz: { _id: q._id, title: q.title },
            attempts: [],
          }
        }
      }),
    )

    return res.json({ success: true, performance })
  } catch (err) {
    console.error("getMyPerformance:", err)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * GET /api/quizzes/:id/leaderboard (PROTECTED VERSION - This is the one we want to use)
 */
export const getQuizLeaderboard = async (req, res) => {
  try {
    const { id } = req.params

    console.log("=== LEADERBOARD REQUEST ===")
    console.log("Quiz ID:", id)

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

    console.log("Current user:", me)

    const quiz = await Quiz.findById(id).lean()
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" })
    }

    console.log("Quiz found:", { title: quiz.title, questions: quiz.questions?.length })

    // fetch top attempts
    const attempts = await QuizAttempt.find({ quizId: id }).sort({ score: -1, timeTaken: 1 }).limit(50).lean()

    console.log("Raw attempts found:", attempts.length)
    console.log("Sample attempt:", attempts[0])

    // build leaderboard with Firebase lookup and privacy filtering
    const leaderboard = await Promise.all(
      attempts.map(async (a, idx) => {
        let displayName = "Anonymous"
        let userPhotoURL = ""
        let shouldShowUser = true

        // Try to get display name from various sources
        if (a.userName && typeof a.userName === "string" && a.userName.trim()) {
          displayName = a.userName.trim()
        } else if (a.userId && req.uid) {
          // if firebase user, try fetch
          try {
            const userRecord = await admin.auth().getUser(a.userId)
            displayName = userRecord.displayName || userRecord.email || "Anonymous"
            userPhotoURL = userRecord.photoURL || ""
          } catch (firebaseError) {
            console.log(`Could not fetch Firebase user ${a.userId}:`, firebaseError.message)
            displayName = "Anonymous"
          }
        }

        // Check user privacy settings from MongoDB
        if (a.userId && a.userId !== "unknown") {
          try {
            const userProfile = await User.findOne({ firebaseUid: a.userId }).lean()
            if (userProfile) {
              // Apply privacy filtering
              if (userProfile.privacy?.leaderboardVisibility === false) {
                displayName = "Anonymous User"
                userPhotoURL = ""
                shouldShowUser = false
              }
              
              // If profile is completely private, hide user info
              if (userProfile.privacy?.profileVisibility === false) {
                displayName = "Anonymous User"
                userPhotoURL = ""
              } else {
                // Use stored profile data if available and privacy allows
                if (userProfile.displayName && userProfile.privacy?.profileVisibility !== false) {
                  displayName = userProfile.displayName
                }
                if (userProfile.photoURL && userProfile.privacy?.profileVisibility !== false) {
                  userPhotoURL = userProfile.photoURL
                }
              }
            }
          } catch (dbError) {
            console.log(`Could not fetch user profile ${a.userId}:`, dbError.message)
          }
        }
        const result = {
          rank: idx + 1,
          userId: shouldShowUser ? (a.userId || "unknown") : "anonymous",
          user: displayName,
          userPhotoURL: userPhotoURL || a.userPhotoURL || "",
          score: a.score || 0,
          timeTaken: a.timeTaken || 0,
          isCurrentUser: String(a.userId) === String(me.id),
          createdAt: a.createdAt,
        }

        console.log(`Processed attempt ${idx + 1}:`, result)
        return result
      }),
    )

    // statistics
    const totalAttempts = attempts.length
    const maxPossibleScore = quiz.questions ? quiz.questions.reduce((sum, q) => sum + (q.points || 0), 0) : 0
    const averageScore =
      totalAttempts > 0 ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / totalAttempts) : 0

    const response = {
      success: true,
      quiz: {
        _id: quiz._id,
        title: quiz.title || "Untitled Quiz",
        description: quiz.description || "",
        maxPossibleScore,
      },
      leaderboard,
      statistics: {
        totalAttempts,
        averageScore,
        maxPossibleScore,
      },
    }

    console.log("=== FINAL RESPONSE ===")
    console.log("Quiz:", response.quiz)
    console.log("Statistics:", response.statistics)
    console.log("Leaderboard entries:", response.leaderboard.length)

    return res.json(response)
  } catch (err) {
    console.error("getQuizLeaderboard ERROR:", err)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

/**
 * GET /api/quizzes/:id/attempts
 * (used by "Quiz Analytics" page) - FIXED VERSION
 */
export const getQuizAttempts = async (req, res) => {
  try {
    const { id } = req.params

    console.log("=== GET QUIZ ATTEMPTS (ANALYTICS) ===")
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

    // Ensure only creator can view - FIXED: String comparison
    if (String(quiz.creatorId) !== String(me.id)) {
      console.log("Access denied - user is not quiz creator")
      return res.status(403).json({
        success: false,
        message: "Access denied. Only quiz creators can view analytics.",
      })
    }

    // All attempts
    const attempts = await QuizAttempt.find({ quizId: id }).sort({ createdAt: -1 }).lean()
    console.log("Found attempts:", attempts.length)

    // Attach displayName similarly
    const enhanced = await Promise.all(
      attempts.map(async (a) => {
        let displayName = a.userName || "Anonymous"
        let email = a.userEmail || ""
        let photoURL = a.userPhotoURL || ""

        if (a.userId && req.uid) {
          try {
            const u = await admin.auth().getUser(a.userId)
            displayName = u.displayName || u.email || displayName
            email = u.email || email
            photoURL = u.photoURL || photoURL
          } catch (firebaseError) {
            console.log(`Could not fetch Firebase user ${a.userId}:`, firebaseError.message)
          }
        }

        return {
          ...a,
          userName: displayName,
          userEmail: email,
          userPhotoURL: photoURL,
          percentage: Math.round(((a.score || 0) / (a.totalPoints || 1)) * 100),
        }
      }),
    )

    console.log("Returning enhanced attempts:", enhanced.length)

    return res.json({
      success: true,
      attempts: enhanced,
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
 * POST /api/users/heartbeat
 * Update user's online status (called periodically by frontend)
 */
export const updateHeartbeat = async (req, res) => {
  try {
    const userId = req.uid
    if (!userId) {
      return res.status(401).json({ success: false, message: "Not authenticated" })
    }

    console.log(`💓 Heartbeat from user: ${userId}`)
    await updateUserLastSeen(userId)

    res.json({ success: true, message: "Heartbeat updated" })
  } catch (error) {
    console.error("❌ updateHeartbeat error:", error)
    res.status(500).json({ success: false, message: "Server error" })
  }
}
